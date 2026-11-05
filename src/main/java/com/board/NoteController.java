package com.board;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Tag(name = "Notas", description = "Crear, listar, editar, mover y eliminar las notas del board")
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
    @ApiResponse(responseCode = "201", description = "Nota creada, con su id y encima de todas las demás (apilado mayor)")
    @ApiResponse(responseCode = "400", description = "Título vacío o ausente", content = @Content)
    @ResponseStatus(HttpStatus.CREATED)
    public Note create(@Valid @RequestBody NewNoteRequest request) {
        Note note = new Note();
        note.updateContent(request.title(), request.text());
        note.setZ(nextZ());
        return repository.save(note);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar nota", description = "Reemplaza el título y el texto de una nota. El título es obligatorio (máximo 100 caracteres tal como se envía, los espacios cuentan; se guarda recortado); si no se envía texto, la nota queda sin texto (nulo; máximo 1000 si se envía). No modifica la posición.")
    @ApiResponse(responseCode = "200", description = "Nota con el título y el texto actualizados")
    @ApiResponse(responseCode = "400", description = "Título vacío o ausente, o longitud excedida", content = @Content)
    @ApiResponse(responseCode = "404", description = "No existe una nota con ese id", content = @Content)
    public Note update(@PathVariable Long id, @Valid @RequestBody NewNoteRequest request) {
        Note note = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        note.updateContent(request.title(), request.text());
        return repository.save(note);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar nota", description = "Elimina definitivamente una nota. No modifica las demás notas.")
    @ApiResponse(responseCode = "204", description = "Nota eliminada")
    @ApiResponse(responseCode = "404", description = "No existe una nota con ese id", content = @Content)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        repository.deleteById(id);
    }

    @PatchMapping("/{id}/position")
    @Operation(summary = "Mover nota y subirla al frente", description = "Guarda la posición (x, y, en píxeles) de una nota y la sube al frente: su apilado (z) pasa a ser mayor que el de todas las demás. Se usa cada vez que se suelta una nota tras agarrarla, aunque no se haya movido. El título y el texto no se modifican. Ambas coordenadas son obligatorias y deben estar entre 0 y 100000.")
    @ApiResponse(responseCode = "200", description = "Nota con su posición y su apilado actualizados")
    @ApiResponse(responseCode = "400", description = "Coordenada ausente, negativa o mayor a 100000", content = @Content)
    @ApiResponse(responseCode = "404", description = "No existe una nota con ese id", content = @Content)
    public Note updatePosition(@PathVariable Long id, @Valid @RequestBody PositionRequest request) {
        Note note = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        note.setX(request.x());
        note.setY(request.y());
        note.setZ(nextZ());
        return repository.save(note);
    }

    /** Apilado que deja la nota al frente: uno más que el mayor existente. */
    private int nextZ() {
        Integer max = repository.findMaxZ();
        return (max == null ? 0 : max) + 1;
    }
}
