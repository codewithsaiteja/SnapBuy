import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TrackingModal({ orderId, onClose, onSimulateCall }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await axios.post(`/api/orders/track/${orderId}`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch tracking', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTracking();
  }, [orderId]);

  const stages = ['PLACED', 'PACKAGING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  if (loading) return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Tracking Order</h2>
        <p>Loading details...</p>
        <button onClick={onClose} style={closeBtnStyle}>Close</button>
      </div>
    </div>
  );

  if (!data || !data.success) return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Tracking Order</h2>
        <p>Could not load tracking information.</p>
        <button onClick={onClose} style={closeBtnStyle}>Close</button>
      </div>
    </div>
  );

  const currentIdx = stages.indexOf(data.trackingStatus);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Track Your Order</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '4px', background: '#e5e7eb', zIndex: 1 }}>
            <div style={{ height: '100%', background: '#2563eb', width: `${(Math.max(0, currentIdx) / (stages.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
          {stages.map((stage, idx) => {
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div style={{ 
                  width: '34px', height: '34px', borderRadius: '50%', 
                  background: isCurrent ? '#2563eb' : isCompleted ? '#10b981' : '#fff',
                  border: `3px solid ${isCompleted || isCurrent ? (isCurrent ? '#2563eb' : '#10b981') : '#e5e7eb'}`,
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  color: '#fff', fontWeight: 'bold'
                }}>
                  {isCompleted && !isCurrent ? '✓' : idx + 1}
                </div>
                <span style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: isCurrent ? 'bold' : 'normal', color: isCurrent ? '#1f2937' : '#6b7280', textTransform: 'capitalize' }}>
                  {stage.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>Estimated Delivery: {data.estimatedDelivery}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dbeafe', color: '#1e40af', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                {data.deliveryPartner[0]}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.875rem' }}>{data.deliveryPartner}</p>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.75rem' }}>Delivery Partner • {data.deliveryPhone}</p>
              </div>
            </div>
            <button onClick={() => {
              onClose();
              if (onSimulateCall) onSimulateCall(data.deliveryPartner);
            }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Call
            </button>
          </div>
        </div>

        <button onClick={onClose} style={closeBtnStyle}>Close Tracking</button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  background: '#fff', padding: '2rem', borderRadius: '12px',
  width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
};

const closeBtnStyle = {
  width: '100%', padding: '0.75rem', background: '#e5e7eb',
  color: '#374151', border: 'none', borderRadius: '6px',
  cursor: 'pointer', fontWeight: 'bold'
};

export default TrackingModal;
