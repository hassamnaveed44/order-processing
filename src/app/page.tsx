export default function HomePage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', maxWidth: '800px', margin: '0 auto', color: '#1a202c' }}>
      <h1 style={{ color: '#2b6cb0' }}>⚡ Order Processing Backend API</h1>
      <p style={{ fontSize: '1.1rem', color: '#4a5568' }}>
        Next.js Full-Stack Backend Performance & BullMQ Asynchronous Processing Workspace.
      </p>

      <div style={{ backgroundColor: '#edf2f7', padding: '1.5rem', borderRadius: '8px', marginTop: '2rem' }}>
        <h2>Available API Endpoints:</h2>
        <ul>
          <li>
            <strong>POST /api/orders/sync</strong> - Synchronous Blocking Endpoint (~3.5s delay)
          </li>
          <li>
            <strong>POST /api/orders</strong> - Optimized Async Queue Endpoint (HTTP 202 Accepted in ~37ms)
          </li>
          <li>
            <strong>GET /api/orders</strong> - Query-Optimized Orders Retrieval (N+1 Query Free)
          </li>
          <li>
            <strong>GET /api/cron/cleanup</strong> - Expired Order Cleanup Cron Task
          </li>
          <li>
            <strong>POST /api/webhooks/payment</strong> - Signed HMAC SHA256 Payment Webhook
          </li>
        </ul>
      </div>
    </div>
  );
}
