package com.board;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NoteApiTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    NoteRepository repository;

    @BeforeEach
    void limpiarNotas() {
        repository.deleteAll();
    }

    @Test
    void crearNotaConTituloYTextoDevuelve201ConLaNota() throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Comprar leche\",\"text\":\"Entera, 2 litros\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Comprar leche"))
                .andExpect(jsonPath("$.text").value("Entera, 2 litros"));
    }

    @Test
    void listarNotasDevuelveLasNotasCreadas() throws Exception {
        crear("Comprar leche", "Entera, 2 litros");
        crear("Llamar al dentista", "Martes por la tarde");

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", containsInAnyOrder("Comprar leche", "Llamar al dentista")))
                .andExpect(jsonPath("$[*].text", containsInAnyOrder("Entera, 2 litros", "Martes por la tarde")));
    }

    @Test
    void crearNotaConTituloVacioDevuelve400YNoGuardaNada() throws Exception {
        for (String titulo : new String[] {"", "   "}) {
            mockMvc.perform(post("/api/notes")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"" + titulo + "\",\"text\":\"Algo\"}"))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void crearNotaSinTextoDevuelve201() throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Solo titulo\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Solo titulo"));
    }

    @Test
    void crearNotaEnviandoElIdDeUnaNotaExistenteCreaUnaNuevaYLaExistenteNoCambia() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Original\",\"text\":\"Texto original\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int idExistente = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":" + idExistente + ",\"title\":\"Intrusa\",\"text\":\"Otro texto\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(not(idExistente)));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.id == " + idExistente + ")].title").value("Original"))
                .andExpect(jsonPath("$[?(@.id == " + idExistente + ")].text").value("Texto original"));
    }

    @Test
    void listarDevuelveLasNotasDeLaMasAntiguaALaMasReciente() throws Exception {
        crear("Primera", "a");
        crear("Segunda", "b");
        crear("Tercera", "c");

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("Primera", "Segunda", "Tercera")));
    }

    @Test
    void crearNotaConEspaciosAlRededorDelTituloLoGuardaRecortado() throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"   Pagar luz  \",\"text\":\"Viernes\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Pagar luz"));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].title").value("Pagar luz"));
    }

    @Test
    void crearNotaConTituloDe101CaracteresDevuelve400YNoGuardaNada() throws Exception {
        String tituloLargo = "a".repeat(101);

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + tituloLargo + "\",\"text\":\"Algo\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void crearNotaConTextoDe1001CaracteresDevuelve400YNoGuardaNada() throws Exception {
        String textoLargo = "a".repeat(1001);

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Titulo\",\"text\":\"" + textoLargo + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void crearNotaConTituloDe100YTextoDe1000CaracteresDevuelve201() throws Exception {
        String titulo = "t".repeat(100);
        String texto = "x".repeat(1000);

        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + titulo + "\",\"text\":\"" + texto + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value(titulo))
                .andExpect(jsonPath("$.text").value(texto));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].text").value(texto));
    }

    @Test
    void unaNotaRecienCreadaNoTienePosicion() throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Sin mover\",\"text\":\"a\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.x").value(nullValue()))
                .andExpect(jsonPath("$.y").value(nullValue()));

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].x").value(nullValue()))
                .andExpect(jsonPath("$[0].y").value(nullValue()));
    }

    @Test
    void actualizarLaPosicionDevuelve200ConLaPosicionNuevaYElListadoLaIncluye() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Mover\",\"text\":\"a\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(patch("/api/notes/" + id + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":120,\"y\":80}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.x").value(120))
                .andExpect(jsonPath("$.y").value(80));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].x").value(120))
                .andExpect(jsonPath("$[0].y").value(80));
    }

    @Test
    void actualizarLaPosicionNoCambiaTituloTextoNiLaPosicionDeOtrasNotas() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Movida\",\"text\":\"Texto movida\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");
        crear("Quieta", "Texto quieta");

        mockMvc.perform(patch("/api/notes/" + id + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":300,\"y\":40}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Movida"))
                .andExpect(jsonPath("$.text").value("Texto movida"));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").value("Movida"))
                .andExpect(jsonPath("$[0].text").value("Texto movida"))
                .andExpect(jsonPath("$[1].title").value("Quieta"))
                .andExpect(jsonPath("$[1].text").value("Texto quieta"))
                .andExpect(jsonPath("$[1].x").value(nullValue()))
                .andExpect(jsonPath("$[1].y").value(nullValue()));
    }

    @Test
    void unaPosicionConCoordenadasNegativasOAusentesDevuelve400YNoCambiaLoGuardado() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Con posicion\",\"text\":\"a\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");
        mockMvc.perform(patch("/api/notes/" + id + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":10,\"y\":20}"))
                .andExpect(status().isOk());

        for (String cuerpo : new String[] {
                "{\"x\":-1,\"y\":20}",
                "{\"x\":10,\"y\":-5}",
                "{\"y\":20}",
                "{\"x\":10}",
                "{}"}) {
            mockMvc.perform(patch("/api/notes/" + id + "/position")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].x").value(10))
                .andExpect(jsonPath("$[0].y").value(20));
    }

    @Test
    void actualizarLaPosicionDeUnaNotaQueNoExisteDevuelve404() throws Exception {
        mockMvc.perform(patch("/api/notes/999999/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":1,\"y\":2}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void unaPosicionMayorA100000Devuelve400YElTopeExactoEsValido() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Lejos\",\"text\":\"a\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(patch("/api/notes/" + id + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":100000,\"y\":100000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.x").value(100000))
                .andExpect(jsonPath("$.y").value(100000));

        for (String cuerpo : new String[] {
                "{\"x\":100001,\"y\":0}",
                "{\"x\":0,\"y\":100001}",
                "{\"x\":2000000000,\"y\":2000000000}"}) {
            mockMvc.perform(patch("/api/notes/" + id + "/position")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].x").value(100000))
                .andExpect(jsonPath("$[0].y").value(100000));
    }

    @Test
    void actualizarElTituloYElTextoDevuelve200ConLaNotaActualizadaYElListadoLaRefleja() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Original\",\"text\":\"Texto original\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(put("/api/notes/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Editado\",\"text\":\"Texto editado\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.title").value("Editado"))
                .andExpect(jsonPath("$.text").value("Texto editado"));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Editado"))
                .andExpect(jsonPath("$[0].text").value("Texto editado"));
    }

    @Test
    void actualizarNoCambiaLaPosicionDeLaNotaNiLasOtrasNotas() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Editable\",\"text\":\"a\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");
        crear("Intacta", "Texto intacta");
        mockMvc.perform(patch("/api/notes/" + id + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":250,\"y\":90}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/notes/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Editada\",\"text\":\"b\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.x").value(250))
                .andExpect(jsonPath("$.y").value(90));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").value("Editada"))
                .andExpect(jsonPath("$[0].x").value(250))
                .andExpect(jsonPath("$[0].y").value(90))
                .andExpect(jsonPath("$[1].title").value("Intacta"))
                .andExpect(jsonPath("$[1].text").value("Texto intacta"))
                .andExpect(jsonPath("$[1].x").value(nullValue()))
                .andExpect(jsonPath("$[1].y").value(nullValue()));
    }

    @Test
    void actualizarConEspaciosAlRededorDelTituloLoGuardaRecortado() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Original\",\"text\":\"a\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(put("/api/notes/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"   Pagar luz  \",\"text\":\"Viernes\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Pagar luz"));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].title").value("Pagar luz"));
    }

    @Test
    void actualizarConElTituloVacioSoloEspaciosOAusenteDevuelve400YNoCambiaLoGuardado() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Se queda\",\"text\":\"Texto que se queda\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        for (String cuerpo : new String[] {
                "{\"title\":\"\",\"text\":\"otro\"}",
                "{\"title\":\"   \",\"text\":\"otro\"}",
                "{\"text\":\"otro\"}"}) {
            mockMvc.perform(put("/api/notes/" + id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Se queda"))
                .andExpect(jsonPath("$[0].text").value("Texto que se queda"));
    }

    @Test
    void actualizarConUnTituloDe101CaracteresOUnTextoDe1001Devuelve400YNoCambiaLoGuardado() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Se queda\",\"text\":\"Texto que se queda\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        for (String cuerpo : new String[] {
                "{\"title\":\"" + "t".repeat(101) + "\",\"text\":\"ok\"}",
                "{\"title\":\"Ok\",\"text\":\"" + "x".repeat(1001) + "\"}"}) {
            mockMvc.perform(put("/api/notes/" + id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(put("/api/notes/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + "t".repeat(100) + "\",\"text\":\"" + "x".repeat(1000) + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].title").value("t".repeat(100)))
                .andExpect(jsonPath("$[0].text").value("x".repeat(1000)));
    }

    @Test
    void actualizarUnaNotaQueNoExisteDevuelve404() throws Exception {
        mockMvc.perform(put("/api/notes/999999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Fantasma\",\"text\":\"a\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void actualizarSinTextoDejaLaNotaSinTexto() throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Con texto\",\"text\":\"Se va a borrar\"}"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(respuesta, "$.id");

        mockMvc.perform(put("/api/notes/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Solo título\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Solo título"))
                .andExpect(jsonPath("$.text").value(nullValue()));

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].title").value("Solo título"))
                .andExpect(jsonPath("$[0].text").value(nullValue()));
    }

    private void crear(String title, String text) throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"text\":\"" + text + "\"}"))
                .andExpect(status().isCreated());
    }
}
