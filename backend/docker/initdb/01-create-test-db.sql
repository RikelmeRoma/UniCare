-- Cria o banco dedicado a suite de testes, separado de unicare_db (desenvolvimento).
-- Roda apenas na primeira inicializacao do volume (o entrypoint do Postgres ignora
-- /docker-entrypoint-initdb.d/ em subseqentes bootes).
CREATE DATABASE unicare_test;