# --- Etapa 1: compilar el jar con Gradle y JDK 21 ---
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew
# Se descarga Gradle y las dependencias antes de copiar el código, para aprovechar la caché de capas
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
# Los tests se ejecutan antes, fuera de la imagen
RUN ./gradlew --no-daemon bootJar -x test

# --- Etapa 2: ejecutar solo con el JRE ---
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/build/libs/*-SNAPSHOT.jar app.jar
# La base H2 es un archivo relativo al directorio de trabajo: ./data/board -> /app/data/board.mv.db
# Va en un volumen para que las notas sobrevivan a recrear el contenedor
RUN mkdir -p /app/data && chown -R 10001:10001 /app
USER 10001
VOLUME /app/data
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
