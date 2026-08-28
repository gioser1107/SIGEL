import type { PasajeroManifiesto } from './abordaje';

export interface ResumenPagosReporte {
  total_reserva_eur: number;
  total_pagado_aprobado_eur: number;
  total_pendiente_validacion_eur: number;
  saldo_pendiente_eur: number;
  pagado_completo: boolean;
  deposito_minimo_cumplido: boolean;
}

export interface PasajeroReporteViaje extends PasajeroManifiesto {
  ocupa_asiento?: boolean;
  resumen_pagos: ResumenPagosReporte;
}

export interface ReservaReporteViaje {
  id: number;
  estado: string;
  fecha_reserva: string | null;
  titular: {
    id: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
  } | null;
  cantidad_pasajeros: number;
  resumen_pagos: ResumenPagosReporte & {
    reserva_id?: number;
    cantidad_pagos?: number;
  };
}

export interface ResumenReporteViaje {
  total_reservas: number;
  total_pasajeros: number;
  reservas_por_estado: Record<string, number>;
  total_reservado_eur: number;
  total_cobrado_eur: number;
  saldo_pendiente_eur: number;
  reservas_pagadas_completas: number;
  reservas_con_saldo: number;
}

export interface ReporteViaje {
  viaje: {
    id: number;
    destino_nombre?: string | null;
    fecha_salida?: string | null;
    guia_nombre?: string | null;
    estado?: string | null;
    unidad_placa?: string | null;
  };
  ocupacion: {
    total_asientos: number;
    total_ocupados: number;
    total_disponibles: number;
  };
  resumen: ResumenReporteViaje;
  reservas: ReservaReporteViaje[];
  pasajeros: PasajeroReporteViaje[];
}
