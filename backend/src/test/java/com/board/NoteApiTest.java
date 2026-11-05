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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
        int idExistente = crear("Original", "Texto original");

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
        int id = crear("Mover", "a");

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
        int id = crear("Movida", "Texto movida");
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
        int id = crear("Con posicion", "a");
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
        int id = crear("Lejos", "a");

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
        int id = crear("Original", "Texto original");

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
        int id = crear("Editable", "a");
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
        int id = crear("Original", "a");

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
        int id = crear("Se queda", "Texto que se queda");

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
        int id = crear("Se queda", "Texto que se queda");

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
        int id = crear("Con texto", "Se va a borrar");

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

    @Test
    void eliminarUnaNotaDevuelve204YYaNoApareceEnElListado() throws Exception {
        int id = crear("A eliminar", "a");

        mockMvc.perform(delete("/api/notes/" + id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void eliminarUnaNotaNoCambiaElTituloElTextoNiLaPosicionDeLasDemas() throws Exception {
        int id1 = crear("Primera", "Texto 1");
        int id2 = crear("Segunda", "Texto 2");
        crear("Tercera", "Texto 3");
        mockMvc.perform(patch("/api/notes/" + id2 + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":300,\"y\":120}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/notes/" + id1))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(id2))
                .andExpect(jsonPath("$[0].title").value("Segunda"))
                .andExpect(jsonPath("$[0].text").value("Texto 2"))
                .andExpect(jsonPath("$[0].x").value(300))
                .andExpect(jsonPath("$[0].y").value(120))
                .andExpect(jsonPath("$[1].title").value("Tercera"))
                .andExpect(jsonPath("$[1].text").value("Texto 3"))
                .andExpect(jsonPath("$[1].x").value(nullValue()))
                .andExpect(jsonPath("$[1].y").value(nullValue()));
    }

    @Test
    void eliminarUnaNotaQueNoExisteDevuelve404YNoCambiaNada() throws Exception {
        crear("Se queda", "Texto");

        mockMvc.perform(delete("/api/notes/999999"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Se queda"));
    }

    @Test
    void eliminarUnaNotaYaEliminadaDevuelve404() throws Exception {
        int id = crear("Una vez", "a");

        mockMvc.perform(delete("/api/notes/" + id))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/notes/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void cadaNotaCreadaQuedaConUnApiladoMayorQueElDeLasAnteriores() throws Exception {
        String r1 = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Primera\",\"text\":\"a\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.z").isNumber())
                .andReturn().getResponse().getContentAsString();
        int z1 = JsonPath.read(r1, "$.z");
        String r2 = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Segunda\",\"text\":\"b\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int z2 = JsonPath.read(r2, "$.z");
        String r3 = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Tercera\",\"text\":\"c\"}"))
                .andReturn().getResponse().getContentAsString();
        int z3 = JsonPath.read(r3, "$.z");

        org.junit.jupiter.api.Assertions.assertTrue(z2 > z1, "la segunda debe quedar encima de la primera");
        org.junit.jupiter.api.Assertions.assertTrue(z3 > z2, "la tercera debe quedar encima de la segunda");

        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].z").value(z1))
                .andExpect(jsonPath("$[1].z").value(z2))
                .andExpect(jsonPath("$[2].z").value(z3));
    }

    @Test
    void actualizarLaPosicionSubeLaNotaAlFrenteYLasDemasConservanSuApilado() throws Exception {
        int a = crear("A", "a");
        crear("B", "b");
        crear("C", "c");
        String antes = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        int zB = JsonPath.read(antes, "$[1].z");
        int zC = JsonPath.read(antes, "$[2].z");

        String respuesta = mockMvc.perform(patch("/api/notes/" + a + "/position")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"x\":10,\"y\":20}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        int zA = JsonPath.read(respuesta, "$.z");

        org.junit.jupiter.api.Assertions.assertTrue(zA > zB && zA > zC, "A debe quedar por encima de B y C");
        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].z").value(zA))
                .andExpect(jsonPath("$[1].z").value(zB))
                .andExpect(jsonPath("$[2].z").value(zC));
    }

    @Test
    void trasActualizarLaPosicionDeVariasNotasElListadoLasApilaEnEseOrden() throws Exception {
        int a = crear("A", "a");
        int b = crear("B", "b");
        int c = crear("C", "c");
        crear("D", "d");

        for (int id : new int[] {a, c, b}) {
            mockMvc.perform(patch("/api/notes/" + id + "/position")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"x\":5,\"y\":5}"))
                    .andExpect(status().isOk());
        }

        String lista = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        int zA = zDe(lista, "A");
        int zB = zDe(lista, "B");
        int zC = zDe(lista, "C");
        int zD = zDe(lista, "D");
        // La última agarrada (B) arriba; luego C, luego A; D, que no se agarró, debajo de todas
        org.junit.jupiter.api.Assertions.assertTrue(zD < zA, "D (sin agarrar) debajo de A");
        org.junit.jupiter.api.Assertions.assertTrue(zA < zC, "A debajo de C");
        org.junit.jupiter.api.Assertions.assertTrue(zC < zB, "C debajo de B");
    }

    @Test
    void editarUnaNotaOEliminarOtraNoCambiaElApiladoDeLasDemas() throws Exception {
        int a = crear("A", "a");
        int b = crear("B", "b");
        int c = crear("C", "c");
        String antes = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        int zA = zDe(antes, "A");
        int zC = zDe(antes, "C");

        // Editar A no cambia su apilado ni el de las demás
        mockMvc.perform(put("/api/notes/" + a)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"A editada\",\"text\":\"nuevo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.z").value(zA));
        // Eliminar B no cambia el apilado de A ni de C
        mockMvc.perform(delete("/api/notes/" + b)).andExpect(status().isNoContent());

        String despues = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(zA, zDe(despues, "A editada"));
        org.junit.jupiter.api.Assertions.assertEquals(zC, zDe(despues, "C"));
    }

    @Test
    void unaNotaSinApiladoGuardadoSeListaConApiladoNuloYLasNuevasQuedanPorEncima() throws Exception {
        // Una nota anterior a esta función: existe en la BD sin apilado
        Note antigua = new Note();
        antigua.updateContent("Antigua", "sin apilado");
        repository.save(antigua);

        mockMvc.perform(get("/api/notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Antigua"))
                .andExpect(jsonPath("$[0].z").value(nullValue()));

        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Nueva\",\"text\":\"n\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.z").isNumber())
                .andReturn().getResponse().getContentAsString();
        int zNueva = JsonPath.read(respuesta, "$.z");
        org.junit.jupiter.api.Assertions.assertTrue(zNueva >= 1, "la nueva tiene un apilado válido");

        // La antigua sigue sin apilado y por debajo de la nueva
        mockMvc.perform(get("/api/notes"))
                .andExpect(jsonPath("$[0].z").value(nullValue()))
                .andExpect(jsonPath("$[1].z").value(zNueva));
    }

    @Test
    void unaPosicionInvalidaNoSubeLaNotaAlFrente() throws Exception {
        int a = crear("A", "a");
        crear("B", "b");
        String antes = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        int zA = zDe(antes, "A");
        int zB = zDe(antes, "B");

        for (String cuerpo : new String[] {
                "{\"x\":-1,\"y\":0}",
                "{\"x\":0,\"y\":100001}",
                "{\"y\":0}",
                "{}"}) {
            mockMvc.perform(patch("/api/notes/" + a + "/position")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        String despues = mockMvc.perform(get("/api/notes")).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(zA, zDe(despues, "A"));
        org.junit.jupiter.api.Assertions.assertEquals(zB, zDe(despues, "B"));
    }

    /** Lee el apilado de la nota con ese título dentro del JSON del listado. */
    private int zDe(String lista, String titulo) {
        java.util.List<Integer> zs = JsonPath.read(lista, "$[?(@.title == '" + titulo + "')].z");
        return zs.get(0);
    }

    /** Crea una nota por la API y devuelve su id. */
    private int crear(String title, String text) throws Exception {
        String respuesta = mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"text\":\"" + text + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(respuesta, "$.id");
    }
}
