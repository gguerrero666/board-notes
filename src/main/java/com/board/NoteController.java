package com.board;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Notas", description = "Crear y listar las notas del board")
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteRepository repository;

    public NoteController(NoteRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    @Operation(summary = "Listar notas", description = "Devuelve todas las notas guardadas. Si no hay ninguna, devuelve una lista vacía.")
    @ApiResponse(responseCode = "200", description = "Lista de notas")
    public List<Note> list() {
        return repository.findAllByOrderByIdAsc();
    }

    @PostMapping
    @Operation(summary = "Crear nota", description = "Crea una nota con título (obligatorio) y texto (opcional).")
    @ApiResponse(responseCode = "201", description = "Nota creada, con su id")
    @ApiResponse(responseCode = "400", description = "Título vacío o ausente", content = @Content)
    @ResponseStatus(HttpStatus.CREATED)
    public Note create(@Valid @RequestBody NewNoteRequest request) {
        Note note = new Note();
        note.setTitle(request.title().trim());
        note.setText(request.text());
        return repository.save(note);
    }
}
