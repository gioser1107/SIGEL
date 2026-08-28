#!/usr/bin/env python3
"""Genera el par patrón CU-02 en Draw.io (secuencia + carriles)."""

from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).with_name("PATRON_CU02_RESERVA_PORTAL.drawio")


def cell(cid, value="", style="", parent="1", vertex=None, edge=None, source=None, target=None, geom=""):
    extra = ""
    if vertex:
        extra += ' vertex="1"'
    if edge:
        extra += ' edge="1"'
    if source:
        extra += f' source="{source}"'
    if target:
        extra += f' target="{target}"'
    val = escape(value).replace("\n", "&#xa;") if value else ""
    return (
        f'        <mxCell id="{cid}" value="{val}" style="{style}" parent="{parent}"{extra}>\n'
        f"          {geom}\n"
        f"        </mxCell>"
    )


def box(cid, value, x, y, w, h, style, parent="1"):
    geom = f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
    return cell(cid, value, style, parent, vertex=True, geom=geom)


def edge_xy(cid, value, x1, y1, x2, y2, dashed=False, parent="1"):
    if dashed:
        style = (
            "endArrow=open;html=1;dashed=1;strokeWidth=1.4;fontSize=11;"
            "fontColor=#0F172A;strokeColor=#1E293B;labelBackgroundColor=#FFFFFF;"
        )
    else:
        style = (
            "endArrow=block;html=1;strokeWidth=1.4;fontSize=11;"
            "fontColor=#0F172A;strokeColor=#1E293B;labelBackgroundColor=#FFFFFF;"
        )
    geom = (
        '<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{x1}" y="{y1}" as="sourcePoint"/>'
        f'<mxPoint x="{x2}" y="{y2}" as="targetPoint"/>'
        "</mxGeometry>"
    )
    return cell(cid, value, style, parent, edge=True, geom=geom)


def self_msg(cid, value, x, y, dashed=False):
    if dashed:
        style = (
            "endArrow=open;html=1;dashed=1;strokeWidth=1.4;fontSize=11;"
            "fontColor=#0F172A;strokeColor=#1E293B;labelBackgroundColor=#FFFFFF;edgeStyle=orthogonalEdgeStyle;"
        )
    else:
        style = (
            "endArrow=block;html=1;strokeWidth=1.4;fontSize=11;"
            "fontColor=#0F172A;strokeColor=#1E293B;labelBackgroundColor=#FFFFFF;edgeStyle=orthogonalEdgeStyle;"
        )
    geom = (
        '<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{x}" y="{y}" as="sourcePoint"/>'
        f'<mxPoint x="{x}" y="{y + 28}" as="targetPoint"/>'
        f'<Array as="points"><mxPoint x="{x + 54}" y="{y}"/><mxPoint x="{x + 54}" y="{y + 28}"/></Array>'
        "</mxGeometry>"
    )
    return cell(cid, value, style, edge=True, geom=geom)


def secuencia():
    # centros de línea de vida
    c = {
        "cli": 110,
        "vista": 360,
        "ctrl": 640,
        "mod": 940,
        "bd": 1240,
        "bit": 1520,
    }
    heads = [
        ("h-cli", "Cliente", 50, 70, 120, 70, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#DBEAFE;strokeColor=#1E3A8A;fontSize=12;fontStyle=1;"),
        ("h-vista", "vistaReserva\n: InterfazReserva", 270, 40, 180, 70, "shape=umlBoundary;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#1E3A8A;fontSize=11;fontStyle=1;"),
        ("h-ctrl", "ctrlReservas\n: ReservasControlador", 550, 40, 180, 70, "shape=umlControl;whiteSpace=wrap;html=1;fillColor=#E0E7FF;strokeColor=#1E3A8A;fontSize=11;fontStyle=1;"),
        ("h-mod", "modeloReservas\n: ReservasModelo", 850, 40, 180, 70, "shape=umlControl;whiteSpace=wrap;html=1;fillColor=#FAE8FF;strokeColor=#6B21A8;fontSize=11;fontStyle=1;"),
        ("h-bd", "bd : MySQL", 1160, 30, 160, 80, "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=14;fillColor=#FEF3C7;strokeColor=#B45309;fontSize=12;fontStyle=1;"),
        ("h-bit", "bitacora : Bitacora", 1440, 40, 160, 70, "shape=umlEntity;whiteSpace=wrap;html=1;fillColor=#FFEDD5;strokeColor=#C2410C;fontSize=11;fontStyle=1;"),
    ]
    parts = [box(*h) for h in heads]

    life_y1, life_y2 = 130, 1980
    lives = []
    for i, key in enumerate(c):
        lives.append(
            cell(
                f"life-{i}",
                "",
                "endArrow=none;dashed=1;html=1;strokeWidth=1.2;strokeColor=#64748B;",
                edge=True,
                geom=(
                    '<mxGeometry relative="1" as="geometry">'
                    f'<mxPoint x="{c[key]}" y="{life_y1}" as="sourcePoint"/>'
                    f'<mxPoint x="{c[key]}" y="{life_y2}" as="targetPoint"/>'
                    "</mxGeometry>"
                ),
            )
        )

    # barras de activación
    acts = [
        ("a-vista", c["vista"] - 8, 250, 16, 1680),
        ("a-ctrl", c["ctrl"] - 8, 430, 16, 1280),
        ("a-mod", c["mod"] - 8, 620, 16, 720),
        ("a-bd1", c["bd"] - 8, 690, 16, 90),
        ("a-bd2", c["bd"] - 8, 860, 16, 90),
        ("a-bit", c["bit"] - 8, 1040, 16, 160),
        ("a-bd3", c["bd"] - 8, 1080, 16, 80),
    ]
    act_cells = [
        box(i, "", x, y, w, h, "fillColor=#FEF9C3;strokeColor=#1E3A8A;rounded=0;")
        for i, x, y, w, h in acts
    ]

    frames = [
        box(
            "alt1",
            "alt  ¿Los datos de la interfaz son válidos?",
            230,
            390,
            1380,
            1540,
            "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;fillColor=none;strokeColor=#9A3412;dashed=1;fontSize=12;fontStyle=1;fontColor=#9A3412;",
        ),
        box(
            "alt2",
            "alt  ¿La sesión y el perfil son válidos?",
            520,
            560,
            1070,
            1180,
            "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;fillColor=none;strokeColor=#1D4ED8;dashed=1;fontSize=12;fontStyle=1;fontColor=#1D4ED8;",
        ),
        box(
            "alt3",
            "alt  ¿Se cumplen las reglas de negocio?",
            820,
            790,
            760,
            560,
            "rounded=0;whiteSpace=wrap;html=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;fillColor=none;strokeColor=#047857;dashed=1;fontSize=12;fontStyle=1;fontColor=#047857;",
        ),
    ]

    title = box(
        "title",
        "CU-02 — Registrar reserva desde el portal del cliente  |  Diagrama de secuencia",
        40,
        0,
        1560,
        28,
        "text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontSize=16;fontStyle=1;fontColor=#0F172A;",
    )
    nota = box(
        "nota",
        "Nomenclatura: actor · boundary (pantalla/modal) · control · entity/database.  Línea vertical = línea de vida.  Rectángulo = activación.  Flecha continua = mensaje.  Flecha discontinua = retorno.  Recuadro alt = decisión (el rombo va en el diagrama de carriles).",
        40,
        1990,
        1560,
        44,
        "rounded=0;whiteSpace=wrap;html=1;align=left;spacingLeft=8;fillColor=#F8FAFC;strokeColor=#64748B;fontSize=11;",
    )

    msgs = [
        edge_xy("m1", "1. Completar viaje, titular, acompañantes, puntos y asientos", c["cli"], 200, c["vista"], 200),
        edge_xy("m2", "2. Pulsar Confirmar reserva", c["cli"], 250, c["vista"], 250),
        self_msg("m3", "3. Validar campos obligatorios", c["vista"], 300),
        edge_xy("m4", "4. POST /api/reservas/cliente  (JWT + datos)", c["vista"], 450, c["ctrl"], 450),
        self_msg("m5", "5. Verificar token, rol Cliente y perfil", c["ctrl"], 500),
        edge_xy("m6", "6. crearReservaDesdeLanding(...)", c["ctrl"], 620, c["mod"], 620),
        edge_xy("m7", "7. Consultar y bloquear cliente, viaje, cupo, puntos y asientos", c["mod"], 690, c["bd"], 690),
        edge_xy("m8", "8. Datos actuales", c["bd"], 750, c["mod"], 750, dashed=True),
        edge_xy("m9", "9. Guardar reserva, viajeros y asientos (sin duplicar cédula ni nombre)", c["mod"], 850, c["bd"], 850),
        edge_xy("m10", "10. reserva creada (id)", c["bd"], 910, c["mod"], 910, dashed=True),
        edge_xy("m11", "11. reserva", c["mod"], 970, c["ctrl"], 970, dashed=True),
        edge_xy("m12", "12. registrarEvento(usuario, módulo reservas, INSERT, tabla, id)", c["ctrl"], 1040, c["bit"], 1040),
        edge_xy("m13", "13. Guardar la entrada de bitácora", c["bit"], 1100, c["bd"], 1100),
        edge_xy("m14", "14. ok", c["bd"], 1150, c["bit"], 1150, dashed=True),
        edge_xy("m15", "15. auditoría registrada", c["bit"], 1200, c["ctrl"], 1200, dashed=True),
        edge_xy("m16", "16. HTTP 200 + mensaje + reserva_id", c["ctrl"], 1260, c["vista"], 1260, dashed=True),
        edge_xy("m17", "17. Mostrar RES-id y continuar al pago", c["vista"], 1310, c["cli"], 1310, dashed=True),
        box("sep-else3", "else  no — viaje, cupo, asiento o datos inválidos", 830, 1360, 740, 24, "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=11;fontStyle=2;fontColor=#047857;"),
        edge_xy("m18", "18. error 400 / 404 / 409 / 422", c["mod"], 1400, c["ctrl"], 1400, dashed=True),
        edge_xy("m19", "19. detalle del error", c["ctrl"], 1450, c["vista"], 1450, dashed=True),
        edge_xy("m20", "20. Mostrar el motivo y permitir corregir", c["vista"], 1500, c["cli"], 1500, dashed=True),
        box("sep-else2", "else  no — token, rol o perfil inválido", 530, 1620, 1040, 24, "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=11;fontStyle=2;fontColor=#1D4ED8;"),
        edge_xy("m21", "21. error 401 / 403", c["ctrl"], 1680, c["vista"], 1680, dashed=True),
        edge_xy("m22", "22. Pedir inicio de sesión o denegar el acceso", c["vista"], 1730, c["cli"], 1730, dashed=True),
        box("sep-else1", "else  no — datos de interfaz inválidos", 240, 1800, 1360, 24, "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=11;fontStyle=2;fontColor=#9A3412;"),
        edge_xy("m23", "23. Indicar los campos que debe corregir", c["vista"], 1860, c["cli"], 1860, dashed=True),
    ]

    inner = "\n".join([title, *parts, *lives, *act_cells, *frames, *msgs, nota])
    return page("seq", "CU-02 Secuencia", 1754, 2200, inner)


def activity_box(cid, text, x, y, w=200, h=54, fill="#EFF6FF", stroke="#1E3A8A"):
    return box(
        cid,
        text,
        x,
        y,
        w,
        h,
        f"rounded=1;whiteSpace=wrap;html=1;arcSize=40;fillColor={fill};strokeColor={stroke};fontSize=11;",
    )


def diamond(cid, text, x, y):
    return box(
        cid,
        text,
        x,
        y,
        170,
        90,
        "rhombus;whiteSpace=wrap;html=1;fillColor=#FFF7ED;strokeColor=#C2410C;fontSize=11;fontStyle=1;",
    )


def obj_node(cid, text, x, y):
    return box(
        cid,
        text,
        x,
        y,
        180,
        36,
        "whiteSpace=wrap;html=1;fillColor=#FEF9C3;strokeColor=#B45309;fontSize=11;fontStyle=2;",
    )


def start_end(cid, x, y, end=False):
    if end:
        style = "ellipse;html=1;shape=endState;fillColor=#1D4ED8;strokeColor=#1E3A8A;"
        return box(cid, "", x, y, 22, 22, style)
    return box(cid, "", x, y, 18, 18, "ellipse;html=1;fillColor=#1D4ED8;strokeColor=#1E3A8A;")


def flow(cid, x1, y1, x2, y2, label=""):
    style = (
        "endArrow=block;html=1;strokeWidth=1.3;fontSize=10;fontColor=#9A3412;"
        "strokeColor=#1E293B;labelBackgroundColor=#FFFFFF;rounded=0;"
    )
    geom = (
        '<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{x1}" y="{y1}" as="sourcePoint"/>'
        f'<mxPoint x="{x2}" y="{y2}" as="targetPoint"/>'
        "</mxGeometry>"
    )
    return cell(cid, label, style, edge=True, geom=geom)


def carriles():
    lanes = [
        ("lane-cli", "Cliente", 40, "#DBEAFE"),
        ("lane-vista", "vistaReserva : InterfazReserva", 340, "#EFF6FF"),
        ("lane-ctrl", "ctrlReservas : ReservasControlador", 640, "#E0E7FF"),
        ("lane-mod", "modeloReservas : ReservasModelo", 940, "#FAE8FF"),
        ("lane-bd", "bd : MySQL", 1240, "#FEF3C7"),
        ("lane-bit", "bitacora : Bitacora", 1540, "#FFEDD5"),
    ]
    lane_cells = [
        box(
            lid,
            name,
            x,
            50,
            290,
            2480,
            f"swimlane;html=1;startSize=40;horizontal=0;fillColor={color};strokeColor=#64748B;fontStyle=1;fontSize=12;whiteSpace=wrap;",
        )
        for lid, name, x, color in lanes
    ]

    title = box(
        "t2",
        "CU-02 — Registrar reserva desde el portal del cliente  |  Diagrama de actividad con carriles",
        40,
        8,
        1790,
        32,
        "text;html=1;strokeColor=none;fillColor=none;align=left;fontSize=16;fontStyle=1;",
    )

    # columnas (contenido, no el header del swimlane)
    x = {
        "cli": 85,
        "vista": 385,
        "ctrl": 685,
        "mod": 985,
        "bd": 1285,
        "bit": 1585,
    }

    nodes = [
        start_end("s0", x["cli"] + 91, 110),
        activity_box("c1", "Abrir la reserva del viaje elegido", x["cli"], 150),
        activity_box("c2", "Indicar titular, acompañantes y puntos de recogida", x["cli"], 220),
        activity_box("c3", "Seleccionar los asientos", x["cli"], 290),
        activity_box("c4", "Pulsar Confirmar reserva", x["cli"], 360),
        activity_box("v1", "Validar campos obligatorios", x["vista"], 430),
        diamond("d1", "¿Datos del formulario válidos?", x["vista"] + 15, 510),
        activity_box("v2", "Enviar POST /api/reservas/cliente con el token", x["vista"], 630),
        activity_box("v1b", "Mostrar los campos a corregir", x["vista"], 720, fill="#FEE2E2", stroke="#B91C1C"),
        activity_box("c5", "Corregir el formulario", x["cli"], 810, fill="#FEE2E2", stroke="#B91C1C"),
        start_end("e1", x["cli"] + 89, 890, end=True),
        activity_box("k1", "Verificar token, rol Cliente y perfil", x["ctrl"], 720),
        diamond("d2", "¿Sesión y perfil válidos?", x["ctrl"] + 15, 800),
        activity_box("k2", "Solicitar crear la reserva", x["ctrl"], 920),
        activity_box("v3", "Mostrar error de autenticación o permiso", x["vista"], 920, fill="#FEE2E2", stroke="#B91C1C"),
        activity_box("c6", "Visualizar el rechazo", x["cli"], 1000, fill="#FEE2E2", stroke="#B91C1C"),
        start_end("e2", x["cli"] + 89, 1080, end=True),
        activity_box("mo1", "Pedir los datos actuales para validar", x["mod"], 1000),
        activity_box("b1", "Consultar y bloquear cliente, viaje, cupo, puntos y asientos", x["bd"], 1080),
        obj_node("o1", "datos actuales", x["bd"] + 10, 1155),
        activity_box("mo2", "Evaluar viaje, reserva previa, cupo, puntos y asientos", x["mod"], 1220),
        diamond("d3", "¿Reglas de negocio cumplidas?", x["mod"] + 15, 1300),
        activity_box("mo3", "Preparar reserva, viajeros-clientes y asientos", x["mod"], 1420),
        activity_box("v4", "Mostrar el error específico", x["vista"], 1420, fill="#FEE2E2", stroke="#B91C1C"),
        activity_box("c7", "Visualizar el motivo y decidir si corrige", x["cli"], 1500, fill="#FEE2E2", stroke="#B91C1C"),
        start_end("e3", x["cli"] + 89, 1580, end=True),
        activity_box("b2", "Guardar la reserva, los viajeros y los asientos", x["bd"], 1500),
        diamond("d4", "¿Persistencia sin conflicto?", x["bd"] + 15, 1580),
        activity_box("b3", "Confirmar los cambios", x["bd"], 1720),
        obj_node("o2", "reserva : Reserva", x["bd"] + 10, 1790),
        obj_node("o3", "viajeros : ReservaCliente", x["bd"] + 10, 1835),
        obj_node("o4", "asientos : AsientoReservado", x["bd"] + 10, 1880),
        activity_box("b4", "Deshacer los cambios", x["vista"], 1720, fill="#FEE2E2", stroke="#B91C1C"),
        activity_box("v5", "Informar que el cupo o el asiento ya fue tomado", x["vista"], 1780, fill="#FEE2E2", stroke="#B91C1C"),
        activity_box("c8", "Elegir otra opción si desea reintentar", x["cli"], 1860, fill="#FEE2E2", stroke="#B91C1C"),
        start_end("e4", x["cli"] + 89, 1940, end=True),
        activity_box("mo4", "Devolver la reserva creada", x["mod"], 1940),
        activity_box("k3", "Pedir el registro de auditoría", x["ctrl"], 2020),
        activity_box("bi1", "Registrar usuario, módulo reservas, acción INSERT, tabla e id", x["bit"], 2100),
        activity_box("b5", "Guardar la entrada de bitácora", x["bd"], 2180),
        activity_box("k4", "Responder mensaje e identificador", x["ctrl"], 2260),
        activity_box("v6", "Mostrar confirmación y número RES", x["vista"], 2340),
        activity_box("c9", "Visualizar la reserva creada", x["cli"], 2420),
        start_end("e5", x["cli"] + 89, 2495, end=True),
    ]

    # El diagrama de actividad en draw.io se lee mejor si el alumno traza las flechas
    # a mano sobre este esqueleto. Dejamos las flechas principales del camino feliz
    # y etiquetas sí/no en los rombos.
    arrows = [
        flow("f1", x["cli"] + 100, 128, x["cli"] + 100, 150),
        flow("f2", x["cli"] + 100, 204, x["cli"] + 100, 220),
        flow("f3", x["cli"] + 100, 274, x["cli"] + 100, 290),
        flow("f4", x["cli"] + 100, 344, x["cli"] + 100, 360),
        flow("f5", x["cli"] + 200, 387, x["vista"] + 100, 430),
        flow("f6", x["vista"] + 100, 484, x["vista"] + 100, 510),
        flow("f7", x["vista"] + 100, 600, x["vista"] + 100, 630, "sí"),
        flow("f8", x["vista"] + 200, 657, x["ctrl"] + 100, 720),
        flow("f9", x["ctrl"] + 100, 774, x["ctrl"] + 100, 800),
        flow("f10", x["ctrl"] + 100, 890, x["ctrl"] + 100, 920, "sí"),
        flow("f11", x["ctrl"] + 200, 947, x["mod"] + 100, 1000),
        flow("f12", x["mod"] + 200, 1054, x["bd"] + 100, 1080),
        flow("f13", x["bd"] + 100, 1191, x["mod"] + 100, 1220),
        flow("f14", x["mod"] + 100, 1274, x["mod"] + 100, 1300),
        flow("f15", x["mod"] + 100, 1390, x["mod"] + 100, 1420, "sí"),
        flow("f16", x["mod"] + 200, 1474, x["bd"] + 100, 1500),
        flow("f17", x["bd"] + 100, 1554, x["bd"] + 100, 1580),
        flow("f18", x["bd"] + 100, 1670, x["bd"] + 100, 1720, "sí"),
        flow("f19", x["bd"] + 100, 1916, x["mod"] + 100, 1940),
        flow("f20", x["mod"] + 100, 1994, x["ctrl"] + 100, 2020),
        flow("f21", x["ctrl"] + 200, 2074, x["bit"] + 100, 2100),
        flow("f22", x["bit"] + 100, 2154, x["bd"] + 100, 2180),
        flow("f23", x["bd"] + 100, 2234, x["ctrl"] + 100, 2260),
        flow("f24", x["ctrl"] + 100, 2314, x["vista"] + 100, 2340),
        flow("f25", x["vista"] + 100, 2394, x["cli"] + 100, 2420),
        flow("f26", x["cli"] + 100, 2474, x["cli"] + 100, 2495),
        # else principales
        flow("n1", x["vista"] + 100, 600, x["vista"] + 100, 720, "no"),
        flow("n2", x["vista"] + 100, 774, x["cli"] + 100, 810),
        flow("n3", x["ctrl"], 845, x["vista"] + 200, 920, "no"),
        flow("n4", x["mod"], 1345, x["vista"] + 200, 1420, "no"),
        flow("n5", x["bd"] + 15, 1625, x["vista"] + 200, 1720, "no — deshacer"),
    ]

    pie = box(
        "pie",
        "Mismo proceso que la secuencia. Endpoint: POST /api/reservas/cliente. Éxito actual: HTTP 200. Los recuadros rojos son caminos de error y no se unen con el éxito.",
        40,
        2540,
        1790,
        36,
        "rounded=0;whiteSpace=wrap;html=1;align=left;spacingLeft=8;fillColor=#F8FAFC;strokeColor=#64748B;fontSize=11;",
    )

    inner = "\n".join([title, *lane_cells, *nodes, *arrows, pie])
    return page("act", "CU-02 Carriles", 1920, 2700, inner)


def page(pid, name, w, h, inner):
    return f"""  <diagram id="{pid}" name="{name}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{w}" pageHeight="{h}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
{inner}
      </root>
    </mxGraphModel>
  </diagram>"""


def main():
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<mxfile host="app.diagrams.net" agent="SIGEL" version="22.1.0" type="device">\n'
        f"{secuencia()}\n"
        f"{carriles()}\n"
        "</mxfile>\n"
    )
    OUT.write_text(xml, encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
