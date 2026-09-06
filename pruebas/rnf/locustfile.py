from locust import HttpUser, between, task


class UsuarioCatalogo(HttpUser):
    wait_time = between(1, 3)

    @task(7)
    def catalogo_destinos(self):
        self.client.get("/api/catalogo/destinos")

    @task(2)
    def salud_api(self):
        self.client.get("/api")

    @task(1)
    def catalogo_viajes(self):
        self.client.get("/api/catalogo/viajes")
