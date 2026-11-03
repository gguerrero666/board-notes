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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

    private void crear(String title, String text) throws Exception {
        mockMvc.perform(post("/api/notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"text\":\"" + text + "\"}"))
                .andExpect(status().isCreated());
    }
}
