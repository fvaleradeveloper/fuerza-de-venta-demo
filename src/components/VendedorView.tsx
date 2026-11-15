import React, { useState, useEffect, useRef } from 'react';
import { Vendedor, ClientVisit, ProductoMaestro, PedidoRapidoCliente, SolicitudVisita } from '../types';
import { CARLOS_GOMEZ_VISITS } from '../data/mockData';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  PlusCircle, 
  ShoppingBag, 
  TrendingUp, 
  AlertCircle,
  FileText,
  DollarSign,
  Phone,
  Plus,
  MessageSquare,
  Calendar,
  Activity,
  ChevronDown,
} from 'lucide-react';
import L from 'leaflet';

interface VendedorViewProps {
  withIGV: boolean;
  selectedVendedor: Vendedor;
  onSelectVendedor: (v: Vendedor) => void;
  allVendedores: Vendedor[];
  productosMaestros?: ProductoMaestro[];
  pedidosRapidosClientes?: PedidoRapidoCliente[];
  solicitudesVisita?: SolicitudVisita[];
  onAjustarPedido?: (id: string, data: Partial<PedidoRapidoCliente>) => void;
  onConfirmarPedido?: (id: string) => void;
  onAtenderSolicitud?: (id: string, estado: SolicitudVisita['estado']) => void;
}

type TabId = 'dashboard' | 'pedidos' | 'venta' | 'cobertura' | 'mapa';

const TAB_LABELS: Record<TabId, string> = {
  dashboard: 'Dashboard de Venta',
  pedidos: 'Gestión de Pedidos',
  venta: 'Gestión de Venta',
  cobertura: 'Gestión de Cobertura',
  mapa: 'Mapa y Clientes No Visitados',
};

const ZONES = ['Todas las Zonas', 'Lima Norte', 'Lima Sur', 'Lima Este', 'Lima Centro'];

export const VendedorView: React.FC<VendedorViewProps> = ({
  withIGV,
  selectedVendedor,
  onSelectVendedor,
  allVendedores,
  productosMaestros = [],
  pedidosRapidosClientes = [],
  solicitudesVisita = [],
  onAjustarPedido,
  onConfirmarPedido,
  onAtenderSolicitud,
}) => {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [visits, setVisits] = useState<ClientVisit[]>(CARLOS_GOMEZ_VISITS);
  const [selectedVisit, setSelectedVisit] = useState<ClientVisit>(visits[4]);
  const [newOrderSKU, setNewOrderSKU] = useState(productosMaestros[0]?.descripcion || 'Producto Demo');
  const [newOrderQty, setNewOrderQty] = useState(10);
  const [orderRegisteredMessage, setOrderRegisteredMessage] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);

  const [filterZone, setFilterZone] = useState<string>('Todas las Zonas');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('Todos');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const filteredVisits = visits.filter((v) => {
    if (filterEstado === 'Completado' && v.status !== 'completado') return false;
    if (filterEstado === 'Pendiente' && v.status !== 'pendiente') return false;
    if (filterEstado === 'En Proceso' && v.status !== 'en_proceso') return false;
    if (filterEstado === 'Rechazado' && v.status !== 'rechazado') return false;
    return true;
  });

  const formatSoles = (amount: number) => {
    const val = withIGV ? amount : amount / 1.18;
    return `S/. ${Math.round(val).toLocaleString('en-US')}`;
  };

  const formatSolesFijo = (amount: number) => {
    return `S/. ${Math.round(amount).toLocaleString('en-US')}`;
  };

  const pct = (num: number, den: number) => den === 0 ? 0 : Math.round((num / den) * 100);

  const handleRegisterOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const skuPrices: Record<string, number> = {
      'Gloria Azul 400g': 4.2,
      'Primor Clásico 900ml': 8.5,
      'Nescafé Tradición 50g': 7.9,
      'Fideos Don Vittorio 450g': 3.1,
    };

    const addedAmount = (skuPrices[newOrderSKU] || 5) * newOrderQty * 24;
    setVisits((prev) =>
      prev.map((vis) =>
        vis.id === selectedVisit.id
          ? {
              ...vis,
              status: 'completado',
              orderTotal: addedAmount,
              completedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : vis
      )
    );
    setOrderRegisteredMessage(true);
    setTimeout(() => setOrderRegisteredMessage(false), 2500);
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const now = new Date();
  const todayStr = `${dayNames[now.getDay()]}, ${now.getDate()} de ${monthNames[now.getMonth()]}`;

  useEffect(() => {
    if (tab === 'mapa' && mapRef.current && !mapInstance.current) {
      const map = L.map(mapRef.current, {
        center: [-12.0921, -77.0423],
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const clientPins: Array<{ id: string; lat: number; lng: number; visited: boolean; current: boolean; label: string }> = [
        { id: 'c1', lat: -12.0900, lng: -77.0400, visited: true, current: false, label: 'Bodega Doña Rosa' },
        { id: 'c2', lat: -12.0950, lng: -77.0450, visited: false, current: false, label: 'Minimarket San Luis' },
        { id: 'c3', lat: -12.1000, lng: -77.0350, visited: false, current: false, label: 'Bodega El Chino Paco' },
        { id: 'c4', lat: -12.0850, lng: -77.0500, visited: true, current: false, label: 'Abarrotes El Sol' },
        { id: 'c5', lat: -12.1050, lng: -77.0420, visited: false, current: false, label: 'Bodega La Victoria' },
        { id: 'cur', lat: -12.0921, lng: -77.0423, visited: false, current: true, label: 'Tu ubicación' },
      ];

      clientPins.forEach((pin, i) => {
        const color = pin.current ? '#22c55e' : pin.visited ? '#3b82f6' : '#ef4444';
        const marker = L.circleMarker([pin.lat, pin.lng], {
          radius: pin.current ? 10 : 8,
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(`<b>${i === clientPins.length - 1 ? '📍 ' : ''}${pin.label}</b>`);
        if (pin.current) {
          map.flyTo([pin.lat, pin.lng], 15);
        }
      });

      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [tab]);

  return (
    <div className="flex flex-col w-full gap-0 pb-24 max-w-full overflow-x-hidden">
      {/* Global Filter Bar */}
      <div className="bg-[#131b2e] dark:bg-[#0f172a] border-b border-[#e0e3e5] dark:border-[#334155] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <span className="font-semibold text-slate-300 dark:text-slate-100 uppercase tracking-wider">Filtro:</span>
          <div className="relative flex-1 sm:flex-auto min-w-[150px]">
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full text-sm font-semibold p-2 rounded-lg border border-[#475569] bg-[#1e293b] dark:bg-[#334155] outline-none text-slate-200 cursor-pointer"
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 sm:flex-auto min-w-[150px]">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-sm font-semibold p-2 rounded-lg border border-[#475569] bg-[#1e293b] dark:bg-[#334155] outline-none text-slate-200 cursor-pointer"
            />
          </div>
          <div className="relative flex-1 sm:flex-auto min-w-[140px]">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full text-sm font-semibold p-2 rounded-lg border border-[#475569] bg-[#1e293b] dark:bg-[#334155] outline-none text-slate-200 cursor-pointer"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Completado">Completado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
          <button
            onClick={() => { setFilterZone('Todas las Zonas'); setFilterDate(''); setFilterEstado('Todos'); }}
            className="text-xs font-bold text-[#ef4444] hover:text-[#fca5a5] px-2 py-1"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#e0e3e5] dark:border-[#334155] bg-[#f2f4f6] dark:bg-[#1e293b]">
        <div className="flex overflow-x-auto scrollbar-hide gap-0 px-2 sm:px-4 pb-1">
          {Object.entries(TAB_LABELS).map(([id, label]) => {
            const isActive = tab === id as TabId;
            return (
              <button
                key={id}
                onClick={() => setTab(id as TabId)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 ${
                  isActive
                    ? 'border-[#131b2e] dark:border-[#0f172a] text-[#131b2e] dark:text-[#f1f5f9] bg-white/40 dark:bg-white/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                } whitespace-nowrap`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================== TAB 1: DASHBOARD DE VENTA (Image 1) ===================== */}
      {tab === 'dashboard' && (
        <>
          {/* Header Row */}
          <div className="bg-[#fdf3d7] border border-[#e5d4a8] p-4 sm:p-6 rounded-xl shadow-xs mb-4">
            <div className="flex justify-between items-start sm:items-center sm:justify-between mb-3 sm:mb-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#4a2c2a]">Zona: 03</h2>
                <h3 className="text-base sm:text-lg font-bold text-[#1e6f9e]">E. de Ventas: Marcelo</h3>
                <p className="text-sm text-[#6b4a2a] mt-1">{todayStr}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#006c49]">FV</span>
              </div>
            </div>
          </div>

          {/* AVANCES Section */}
          <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-6 rounded-xl shadow-xs mb-4">
            <div className="flex items-center mb-4">
              <Activity className="w-4 h-4 text-[#ef4444] mr-2" />
              <h3 className="font-bold text-sm sm:text-base text-[#4a2c2a] dark:text-[#f1f5f9] uppercase tracking-wide">AVANCES</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Días', val: '16 de 25', pct: 64, color: 'text-[#ef4444]', bg: 'bg-[#fecaca]' },
                { label: 'Pedidos', val: '200 de 500', pct: 40, color: 'text-[#ef4444]', bg: 'bg-[#fecaca]' },
                { label: 'Ventas S/.', val: '50,000 de 100,000', pct: 50, color: 'text-[#ef4444]', bg: 'bg-[#fecaca]' },
                { label: 'Cobertura', val: '120 de 180', pct: 67, color: 'text-[#22c55e]', bg: 'bg-[#bbf7d0]' },
              ].map((m, i) => (
                <div key={i} className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-3 sm:p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-[#45464d] dark:text-[#cbd5e1]">{m.label}</span>
                    <span className="text-xs font-bold {m.color}">{m.pct}%</span>
                  </div>
                  <div className="w-full bg-[#e6e8ea] dark:bg-[#475569] h-2 rounded-full overflow-hidden mb-2">
                    <div className={`h-full {m.color.replace('text-', 'bg-')}`} style={{ width: `${m.pct}%` }}></div>
                  </div>
                  <div className="text-xs font-mono font-bold text-[#191c1e] dark:text-[#f1f5f9]">{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Puntuality Card */}
          <div className="bg-[#f0fdf4] dark:bg-[#064e3b]/20 border border-[#86efac] dark:border-[#14532d] p-4 sm:p-6 rounded-xl shadow-xs mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#86efac] text-[#065f46] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-[#14532d]">Hora de inicio 7:24 · Puntual</h4>
                <p className="text-xs text-[#166534]">10 de 10 días puntuales</p>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-5 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-xs font-bold text-[#45464d] dark:text-[#cbd5e1] uppercase">Venta del Día</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#191c1e] dark:text-[#f1f5f9] font-mono">{formatSoles(selectedVendedor.currentSales)}</span>
                <span className="text-[10px] sm:text-xs font-bold text-[#00714d]">115% de cuota</span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#76777d] dark:text-[#94a3b8] mt-1">Meta diaria: {formatSoles(selectedVendedor.quotaTarget)}</p>
            </div>
            <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-5 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-xs font-bold text-[#45464d] dark:text-[#cbd5e1] uppercase">Avance de Visitas de Hoy</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl sm:text-2xl font-extrabold text-[#191c1e] dark:text-[#f1f5f9] font-mono">
                  {visits.filter((v) => v.status === 'completado').length} / {visits.length}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-[#00714d]">{pct(visits.filter((v) => v.status === 'completado').length, visits.length)}%</span>
              </div>
              <p className="text-[10px] sm:text-xs text-[#76777d] dark:text-[#94a3b8] mt-1">{visits.filter((v) => v.status === 'pendiente').length} pendientes en hoja de ruta</p>
            </div>
          </div>
        </>
      )}

      {/* ===================== TAB 2: GESTIÓN DE PEDIDOS (Image 2 top) ===================== */}
      {tab === 'pedidos' && (
        <div className="space-y-6">
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 sm:p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-start sm:items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1e293b]">Gestión de pedidos</h3>
                <span className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mt-1 block">Cantidad faltante hoy</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#fecaca] text-[#ef4444] text-xs font-bold">Faltan 6 hoy</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm">
                <div className="text-4xl sm:text-5xl font-extrabold text-[#1e293b] font-mono mb-1">14</div>
                <div className="text-xs text-[#64748b]">de 20 pedidos</div>
                <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-[#1e293b] h-full rounded-full" style={{ width: '70%' }}></div>
                </div>
                <div className="text-xs text-[#64748b]">Días con 20 o más pedidos este mes: <span className="font-bold text-[#1e293b]">7 de 9</span></div>
              </div>
              <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm">
                <div className="text-sm font-bold text-[#1e293b] mb-3">Proyección del mes</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#dc2626] font-mono mb-1">62.5%</div>
                <div className="text-xs text-[#64748b]">313 de 500</div>
                <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-[#dc2626] h-full rounded-full" style={{ width: '62.5%' }}></div>
                </div>
                <div className="mt-3 p-3 bg-[#fef2f2] border border-[#fecaca] rounded text-sm text-[#991b1b] font-semibold">
                  Bono 105%: necesitas 36 pedidos por día
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: GESTIÓN DE VENTA (Image 2 bottom) ===================== */}
      {tab === 'venta' && (
        <div className="space-y-6">
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 sm:p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-start sm:items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1e293b]">Gestión de venta</h3>
                <span className="text-xs font-bold text-[#1e293b] uppercase tracking-wider mt-1 block">Total acumulado en soles vs total estimado del mes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm">
                <div className="text-5xl sm:text-6xl font-extrabold text-[#1e293b] font-mono mb-1">S/ 2,860</div>
                <div className="text-xs text-[#64748b]">de S/ 4,113</div>
                <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-[#1e293b] h-full rounded-full" style={{ width: '69%' }}></div>
                </div>
                <div className="mt-3 p-3 bg-[#fee2e2] border border-[#fca5a5] rounded text-sm text-[#991b1b] font-semibold">
                  Te faltan S/ 1,253 hoy para ir al día con tu cuota.
                </div>
              </div>
              <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm">
                <div className="text-sm font-bold text-[#1e293b] mb-3">Acumulado del mes</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#1e293b] font-mono mb-2">S/ 37,060</div>
                <div className="text-sm font-bold text-[#1e293b] mb-3">Proyección del mes</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#dc2626] font-mono mb-1">78.1%</div>
                <div className="text-xs text-[#64748b]">78,125 de 100,000</div>
                <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-4 mb-2">
                  <div className="bg-[#dc2626] h-full rounded-full" style={{ width: '78.1%' }}></div>
                </div>
                <div className="mt-3 p-3 bg-[#fef2f2] border border-[#fecaca] rounded text-sm text-[#991b1b] font-semibold">
                  Bono 105%: necesitas S/ 6,111 por día
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: GESTIÓN DE COBERTURA (Image 3) ===================== */}
      {tab === 'cobertura' && (
        <div className="space-y-6">
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 sm:p-8 rounded-xl shadow-sm">
            <div className="flex justify-between items-start sm:items-center mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1e293b]">Gestión de cobertura</h3>
                <span className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider mt-1 block">Ruta jueves - 45 clientes</span>
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="text-4xl sm:text-5xl font-extrabold text-[#dc2626] font-mono">17</div>
                <span className="text-xs font-bold text-[#1e293b]">clientes pendientes de cobertura en tu ruta</span>
              </div>
              <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-3 mb-2">
                <div className="bg-[#1e293b] h-full rounded-full" style={{ width: '37%' }}></div>
              </div>
              <div className="text-xs text-[#64748b] mt-1">28 de 45 clientes ya compraron este mes · 62%</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-extrabold text-[#1e293b] font-mono mb-1">9 clientes</div>
                <div className="text-xs text-[#64748b]">Nuevas coberturas hoy</div>
              </div>
              <div className="bg-white border border-[#e2e8f0] p-4 rounded-lg shadow-sm">
                <div className="text-2xl font-extrabold text-[#1e293b] font-mono mb-1">2.ª de 4</div>
                <div className="text-xs text-[#64748b]">Visita de esta ruta en el mes</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { dia: 'Lun', val: 8 },
                { dia: 'Mar', val: 11 },
                { dia: 'Mie', val: 6 },
                { dia: 'Hoy', val: 17, isToday: true },
                { dia: 'Vie', val: 22 },
                { dia: 'Sáb', val: 25 },
              ].map((d) => (
                <div key={d.dia} className={`bg-white border border-[#e2e8f0] p-3 rounded-lg shadow-sm text-center ${d.isToday ? 'border-[#1e293b] bg-[#1e293b]' : ''}`}>
                  <div className={`text-xs font-bold ${d.isToday ? 'text-white' : 'text-[#64748b]'}`}>{d.dia}</div>
                  <div className={`text-2xl font-extrabold font-mono mt-1 ${d.isToday ? 'text-white' : 'text-[#1e293b]'}`}>{d.val}</div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-[#e2e8f0] p-5 rounded-lg shadow-sm">
              <div className="flex justify-between items-end mb-2">
                <div className="text-sm font-bold text-[#1e293b]">Proyección del mes</div>
                <span className="text-2xl font-extrabold text-[#22c55e] font-mono">104.2%</span>
              </div>
              <div className="text-xs text-[#64748b]">188 de 180</div>
              <div className="w-full bg-[#e2e8f0] h-3 rounded-full overflow-hidden mt-3 mb-2">
                <div className="bg-[#22c55e] h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="mt-3 p-3 bg-[#f0fdf4] border border-[#86efac] rounded text-sm text-[#166534] font-semibold">
                Bono 95% (171 clientes): ¡vas camino a lograrlo!
              </div>
            </div>
          </div>

          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 sm:p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3b82f6]" />
                <span className="font-bold text-sm text-[#1e293b]">Mapa y clientes sin compra en el mes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-[#1e293b]">Ver</span>
                <ChevronDown className="w-4 h-4 text-[#64748b]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: MAPA Y CLIENTES NO VISITADOS (Image 4) ===================== */}
      {tab === 'mapa' && (
        <div className="space-y-4">
          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 sm:p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1e293b]">Mapa y clientes sin compra en el mes</h3>
                <p className="text-xs text-[#64748b] mt-1">Clientes visitados(azul) · no visitados(rojo) · cliente actual(verde)</p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-[#1e293b]">Tu ubicación:</span>
                <span className="block text-sm text-[#1e293b] font-mono">Av. Aviación 2850, San Borja</span>
              </div>
            </div>
            <div className="w-full h-[400px] sm:h-[500px] rounded-xl border border-[#e2e8f0] bg-white overflow-hidden" ref={mapRef} />
          </div>

          <div className="bg-[#f8fafc] border border-[#e2e8f0] p-4 sm:p-6 rounded-xl shadow-sm">
            <h4 className="font-bold text-sm sm:text-base text-[#1e293b] mb-3">Lista de Clientes No Visitados</h4>
            <div className="space-y-3">
              {[
                { num: 1, nombre: 'Bodega Doña Rosa', direccion: 'Jr. Las Begonias 412', ult: 'sep', color: '#ef4444' },
                { num: 2, nombre: 'Minimarket San Luis', direccion: 'Av. San Luis 1980', ult: 'oct', color: '#ef4444' },
                { num: 3, nombre: 'Bodega El Chino Paco', direccion: 'Calle Las Artes 230', ult: 'oct', color: '#ef4444' },
                { num: 4, nombre: 'Bodega El Sol', direccion: 'Av. Universitaria 4150', ult: 'nov', color: '#22c55e' },
                { num: 5, nombre: 'Bodega La Victoria', direccion: 'Jr. Angélica Gamarra 1640', ult: 'oct', color: '#ef4444' },
              ].map((c) => (
                <div key={c.num} className="flex items-center gap-3 bg-white border border-[#e2e8f0] p-3 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${c.color === '#ef4444' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {c.num}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#1e293b]">{c.nombre}</div>
                    <div className="text-xs text-[#64748b]">{c.direccion}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#1e293b]">Últ. compra</div>
                    <div className="text-xs font-bold text-[#64748b]">{c.ult}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== PEDIDOS RÁPIDOS / SOLICITUDES DE VISITA (Always visible below tabs) ===================== */}
      {(pedidosRapidosClientes.length > 0 || solicitudesVisita.length > 0) && (
        <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-6 rounded-xl shadow-xs w-full mt-6">
          <h3 className="font-bold text-sm sm:text-base mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Pedidos rápidos / Solicitudes de visita de clientes</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-bold mb-2">Pedidos rápidos solicitados</h4>
              <div className="space-y-2">
                {pedidosRapidosClientes.map((p) => (
                  <div key={p.id} className="p-3 bg-white dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] rounded-lg">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold">{p.razonSocial}</span>
                      <span className={`px-2 py-0.5 rounded-full ${p.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-800' : p.estado === 'ajustado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{p.estado}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Total solicitado: S/. {p.total.toFixed(2)}</div>
                    {p.observacionesCliente && <div className="text-[10px] mt-1 italic">Cliente: {p.observacionesCliente}</div>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => onAjustarPedido?.(p.id, { observacionesVendedor: 'Revisado, ajustar precios/descuentos', descuento: 0 })} className="px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded">Ajustar con descuento/oferta</button>
                      <button onClick={() => onConfirmarPedido?.(p.id)} className="px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 rounded">Confirmar pedido</button>
                    </div>
                  </div>
                ))}
                {pedidosRapidosClientes.length === 0 && <p className="text-xs text-slate-500">Sin pedidos rápidos</p>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold mb-2">Solicitudes de visita</h4>
              <div className="space-y-2">
                {solicitudesVisita.map((s) => (
                  <div key={s.id} className="p-3 bg-white dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] rounded-lg">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold">{s.razonSocial}</span>
                      <span className="text-[10px]">{s.fechaPreferida} {s.horaPreferida}</span>
                    </div>
                    <div className="text-[10px] mt-1">Motivo: {s.motivo}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => onAtenderSolicitud?.(s.id, 'aceptado')} className="px-2 py-1 text-[10px] bg-emerald-50 text-emerald-700 rounded">Aceptar</button>
                      <button onClick={() => onAtenderSolicitud?.(s.id, 'programado')} className="px-2 py-1 text-[10px] bg-blue-50 text-blue-700 rounded">Programar</button>
                      <button onClick={() => onAtenderSolicitud?.(s.id, 'rechazado')} className="px-2 py-1 text-[10px] bg-red-50 text-red-700 rounded">Rechazar</button>
                    </div>
                  </div>
                ))}
                {solicitudesVisita.length === 0 && <p className="text-xs text-slate-500">Sin solicitudes</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TOMA DE PEDIDO RÁPIDO (Keep existing order pad) ===================== */}
      <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-6 rounded-xl shadow-xs w-full mt-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#131b2e]" />
          <h3 className="font-bold text-sm sm:text-base text-[#191c1e] dark:text-[#f1f5f9]">
            Toma de Pedido Rápido
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-[#45464d] dark:text-[#cbd5e1] mb-3 sm:mb-4">
          Cliente actual: <strong className="text-slate-900 dark:text-slate-100">{selectedVisit.clientName}</strong>
        </p>

        {orderRegisteredMessage ? (
          <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-emerald-900">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-xs sm:text-sm">¡Pedido Registrado con Éxito!</h4>
            <p className="text-[10px] sm:text-[11px] mt-1">
              Enviado a almacén de despacho Callao para facturación.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegisterOrder} className="space-y-3 sm:space-y-4 w-full">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm font-semibold text-[#45464d] dark:text-[#cbd5e1]">
                  Seleccionar Producto / Línea
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewProduct(!showNewProduct)}
                  className="flex items-center gap-1 text-xs font-bold text-[#131b2e] dark:text-[#f1f5f9] hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  Nuevo producto
                </button>
              </div>
              <select
                value={newOrderSKU}
                onChange={(e) => setNewOrderSKU(e.target.value)}
                className="w-full text-sm font-semibold p-2 sm:p-2.5 rounded-lg border border-[#c6c6cd] dark:border-[#475569] bg-white dark:bg-[#1e293b] outline-none text-[#191c1e] dark:text-[#f1f5f9]"
              >
                {productosMaestros.length > 0 ? (
                  productosMaestros.map((p) => (
                    <option key={p.id} value={p.descripcion}>
                      {p.descripcion} {p.marca ? `(${p.marca})` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Producto Demo 1">Producto Demo 1</option>
                    <option value="Producto Demo 2">Producto Demo 2</option>
                    <option value="Producto Demo 3">Producto Demo 3</option>
                  </>
                )}
              </select>
              {showNewProduct && (
                <div className="mt-2 p-2 bg-white dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] rounded-lg text-xs text-[#45464d] dark:text-[#cbd5e1]">
                  Nuevo producto se gestiona desde Maestros / CRUD → Productos
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#45464d] dark:text-[#cbd5e1] mb-1">
                Cantidad de Cajas / Fardos
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewOrderQty((q) => Math.max(q - 1, 1))}
                  className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-white dark:bg-[#1e293b] border border-[#c6c6cd] dark:border-[#475569] font-bold text-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  value={newOrderQty}
                  onChange={(e) => setNewOrderQty(parseInt(e.target.value) || 1)}
                  className="flex-1 text-center font-mono font-bold text-xs sm:text-sm p-2 rounded-lg border border-[#c6c6cd] dark:border-[#475569] bg-white dark:bg-[#1e293b] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewOrderQty((q) => q + 1)}
                  className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-white dark:bg-[#1e293b] border border-[#c6c6cd] dark:border-[#475569] font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] rounded-lg">
              <div className="flex justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-1">
                <span>Subtotal Estimado:</span>
                <span className="font-mono">{formatSolesFijo(newOrderQty * 95)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm font-bold text-[#191c1e] dark:text-[#f1f5f9] pt-1 border-t border-slate-100 dark:border-slate-700">
                <span>Total con IGV (18%):</span>
                <span className="font-mono text-emerald-700">
                  {formatSolesFijo(newOrderQty * 95 * 1.18)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 sm:py-2.5 bg-[#131b2e] hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span>Confirmar y Enviar Pedido</span>
            </button>
          </form>
        )}
      </div>

      {/* ===================== FIELD ROUTE CHECKLIST ===================== */}
      <div className="bg-[#f2f4f6] dark:bg-[#1e293b] border border-[#e0e3e5] dark:border-[#334155] p-4 sm:p-6 rounded-xl shadow-xs w-full mt-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#191c1e] dark:text-[#f1f5f9]">
              Hoja de Ruta de Visitas - Turno Mañana/Tarde
            </h2>
            <p className="text-[10px] sm:text-xs text-[#45464d] dark:text-[#cbd5e1]">
              Clientes bodegueros ordenados por secuencia óptima de recorrido
            </p>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Distrito: Los Olivos / SMP
          </span>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {filteredVisits.map((vis) => {
            const isSelected = selectedVisit.id === vis.id;
            return (
              <div
                key={vis.id}
                onClick={() => setSelectedVisit(vis)}
                className={`p-3 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-[#1e293b] border-slate-900 shadow-xs'
                    : 'bg-white dark:bg-[#1e293b]/80 border-[#e0e3e5] dark:border-[#334155] hover:bg-white dark:bg-[#1e293b]'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                    {vis.status === 'completado' ? (
                      <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-600" />
                    ) : vis.status === 'en_proceso' ? (
                      <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 animate-spin" />
                    ) : vis.status === 'rechazado' ? (
                      <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-red-600" />
                    ) : (
                      <div className="w-4 sm:w-5 h-4 sm:h-5 rounded-full border-2 border-slate-300"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs sm:text-sm text-[#191c1e] dark:text-[#f1f5f9] truncate">
                        {vis.clientName}
                      </h4>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono">({vis.scheduledTime})</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-[#45464d] dark:text-[#cbd5e1] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-slate-400 dark:text-slate-500" />
                      {vis.address}, {vis.district}
                    </p>
                    {vis.notes && (
                      <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                        Nota: {vis.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end flex-shrink-0">
                  {vis.orderTotal ? (
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700">
                      {formatSoles(vis.orderTotal)}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">Sin pedido</span>
                  )}

                  <span
                    className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      vis.status === 'completado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : vis.status === 'en_proceso'
                        ? 'bg-blue-100 text-blue-800'
                        : vis.status === 'rechazado'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {vis.status === 'completado'
                      ? 'Pedido Concretado'
                      : vis.status === 'en_proceso'
                      ? 'En Atención'
                      : vis.status === 'rechazado'
                      ? 'Rechazado / Reprog.'
                      : 'Por Visitar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
