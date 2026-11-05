package com.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.hibernate.annotations.DynamicUpdate;

@Entity
@DynamicUpdate
@Schema(description = "Nota del board con título y texto")
public class Note {

    @Id
    @Schema(description = "Identificador generado al crear la nota", accessMode = Schema.AccessMode.READ_ONLY, example = "1")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Schema(description = "Título de la nota. Obligatorio, no puede estar vacío ni ser solo espacios", example = "Comprar leche", requiredMode = Schema.RequiredMode.REQUIRED)
    @Column(length = 100)
    private String title;
    @Schema(description = "Texto de la nota. Opcional", example = "Entera, 2 litros", nullable = true)
    @Column(length = 1000)
    private String text;
    @Schema(description = "Posición horizontal en píxeles. Nula mientras la nota no se haya movido", example = "120", nullable = true)
    private Integer x;
    @Schema(description = "Posición vertical en píxeles. Nula mientras la nota no se haya movido", example = "80", nullable = true)
    private Integer y;
    @Schema(description = "Orden de apilado: a mayor valor, más al frente. Nulo mientras la nota no se haya agarrado ni creado con esta función", example = "3", nullable = true)
    private Integer z;

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getText() { return text; }
    /** Reemplaza el contenido de la nota; el título se guarda recortado. */
    public void updateContent(String title, String text) {
        this.title = title.trim();
        this.text = text;
    }

    public Integer getX() { return x; }
    public Integer getY() { return y; }
    public Integer getZ() { return z; }
    public void setZ(Integer z) { this.z = z; }
    public void setX(Integer x) { this.x = x; }
    public void setY(Integer y) { this.y = y; }
}
