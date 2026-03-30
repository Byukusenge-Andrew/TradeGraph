'use client';

import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export default function AlertListener() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5000/hubs/alerts", {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    connection.on("AlertReceived", (message) => {
      setAlerts(prev => [...prev, { id: Date.now(), ...message }]);
      
      // Auto-remove after 5s
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== message.id));
      }, 5000);
    });

    connection.start()
      .then(() => console.log('SignalR connected to /hubs/alerts'))
      .catch(err => console.error('SignalR failed', err));

    return () => {
      connection.stop();
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {alerts.map((alert, i) => (
        <div key={i} style={{
          background: 'rgba(239, 68, 68, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '12px 16px',
          borderRadius: 8,
          color: 'white',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
          minWidth: 300,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⚠️</span> {alert.type === 'stock_low' ? 'Low Stock Alert' : 'System Alert'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {alert.data?.ProductName ? `${alert.data.ProductName} is critically low on stock (${alert.data.CurrentStock} qty)` : JSON.stringify(alert.data)}
          </div>
        </div>
      ))}
    </div>
  );
}
