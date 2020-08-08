FROM openjdk:8
COPY ./Hello.java /usr/src/myapp
WORKDIR ./ 
RUN javac Hello.java
CMD ["java", "Hello"]
