package com.board;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findAllByOrderByIdAsc();

    /** Mayor apilado guardado, o nulo si ninguna nota lo tiene. */
    @Query("select max(n.z) from Note n")
    Integer findMaxZ();
}
