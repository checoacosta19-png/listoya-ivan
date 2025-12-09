import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  if (path === '/cocina') return <CocinaScreen />;
  if (path === '/clientes') return <ClientesScreen />;
  if (path === '/cajero') return <CajeroPanel />;
  return <Home />;
}

function Home() {
  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">¡Bienvenido a ListoYa! - Ivan</h1>
      <div className="space-x-4">
        <a href="/cocina" className="bg-blue-500 text-white px-4 py-2 rounded">Cocina</a>
        <a href="/clientes" className="bg-green-500 text-white px-4 py-2 rounded">Clientes</a>
        <a href="/cajero" className="bg-yellow-500 text-white px-4 py-2 rounded">Cajero</a>
      </div>
    </div>
  );
}

function CocinaScreen() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel('pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
        fetchPedidos();
      })
      .subscribe();

    fetchPedidos();

    // Sonido al cargar nuevo pedido
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhgKNPv6y2Y3YhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhgKNPv6y2Y3Y='); // Ding sound base64 simple

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPedidos = async () => {
    const { data } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    setPedidos(data || []);
    if (data && data.length > pedidos.length) {
      // Reproducir sonido si hay nuevo
      audio.play().catch(() => {});
    }
  };

  const marcarListo = async (id) => {
    await supabase.from('pedidos').update({ estado: 'listo' }).eq('id', id);
  };

  return (
    <div className="min-h-screen bg-red-100 p-4">
      <h1 className="text-3xl font-bold text-red-600 mb-4">🛠️ Cocina - Pedidos Pendientes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pedidos.filter(p => p.estado === 'pendiente').map((pedido) => (
          <div key={pedido.id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold">Pedido #{pedido.numero}</h2>
            <p>Cliente: {pedido.nombre}</p>
            <p className="mt-2">{pedido.detalles}</p>
            <p className="text-sm text-gray-500 mt-2">Hora: {new Date(pedido.created_at).toLocaleTimeString()}</p>
            <button
              onClick={() => marcarListo(pedido.id)}
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded w-full"
            >
              Marcar Listo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientesScreen() {
  const [pedidosListos, setPedidosListos] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel('pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        fetchListos();
      })
      .subscribe();

    fetchListos();
    const interval = setInterval(fetchListos, 30000); // Cada 30s

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchListos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('estado', 'listo')
      .order('updated_at', { ascending: false })
      .limit(20);
    setPedidosListos(data || []);
  };

  return (
    <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-bold text-green-600 mb-8">🎉 ¡Pedidos Listos!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
        {pedidosListos.map((pedido) => (
          <div key={pedido.id} className="bg-white p-6 rounded-lg shadow-lg text-center animate-pulse">
            <h2 className="text-4xl font-bold text-blue-600 mb-2">#{pedido.numero}</h2>
            <p className="text-xl">{pedido.nombre}</p>
            <p className="text-green-600 font-bold mt-2">¡Está listo! Ven a recogerlo</p>
          </div>
        ))}
      </div>
      {pedidosListos.length === 0 && <p className="text-xl mt-8">Ningún pedido listo aún...</p>}
    </div>
  );
}

function CajeroPanel() {
  const [nombre, setNombre] = useState('');
  const [detalles, setDetalles] = useState('');
  const [numero, setNumero] = useState(1);

  const agregarPedido = async (e) => {
    e.preventDefault();
    const nuevoNumero = numero;
    const { error } = await supabase
      .from('pedidos')
      .insert([{ numero: nuevoNumero, nombre, detalles, estado: 'pendiente' }]);
    if (!error) {
      setNombre('');
      setDetalles('');
      setNumero(nuevoNumero + 1);
      alert('¡Pedido agregado!');
    }
  };

  return (
    <div className="min-h-screen bg-yellow-100 p-4">
      <h1 className="text-3xl font-bold text-yellow-600 mb-4">💰 Panel Cajero</h1>
      <form onSubmit={agregarPedido} className="bg-white p-6 rounded shadow max-w-md mx-auto">
        <label className="block mb-2">Número de Pedido:</label>
        <input type="number" value={numero} onChange={(e) => setNumero(parseInt(e.target.value))} className="w-full p-2 border rounded mb-4" required />

        <label className="block mb-2">Nombre Cliente:</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border rounded mb-4" required />

        <label className="block mb-2">Detalles del Pedido:</label>
        <textarea value={detalles} onChange={(e) => setDetalles(e.target.value)} className="w-full p-2 border rounded mb-4" rows="3" required />

        <button type="submit" className="bg-blue-500 text-white px-6 py-2 rounded w-full">Agregar Pedido</button>
      </form>
    </div>
  );
}

export default App;
