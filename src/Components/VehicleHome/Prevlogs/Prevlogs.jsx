import { useEffect, useState } from 'react';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import './Prevlogs.css';
import { getVehicleLogs } from '../../../api/api';

const Prevlogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getVehicleLogs();
        setLogs(data);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load vehicle logs.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const totalLiters = logs.reduce((sum, log) => sum + log.litresPumped, 0);

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="logs-hero panel rise-in">
          <div>
            <span className="section-badge">Logs</span>
            <h1>Vehicle logs</h1>
            <p className="lead-text">Review past transactions.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Entries</div>
              <div className="metric-value">{logs.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Liters</div>
              <div className="metric-value">{totalLiters}L</div>
            </div>
          </div>
        </section>

        <section className="page-section panel logs-table-panel">
          <div className="section-heading">
            <div>
              <span className="section-badge">History</span>
              <h2>Transactions</h2>
            </div>
          </div>

          <div className="table-shell">
            {isLoading ? (
              <div className="empty-state">Loading transaction history...</div>
            ) : error ? (
              <div className="response-banner error-banner">{error}</div>
            ) : logs.length === 0 ? (
              <div className="empty-state">No vehicle transactions were found yet.</div>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Date</th>
                    <th>Fuel station</th>
                    <th>Amount of liters</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td data-label="Transaction">{log._id}</td>
                      <td data-label="Date">{new Date(log.date).toLocaleDateString()}</td>
                      <td data-label="Fuel station">{log.stationName}</td>
                      <td data-label="Amount">{log.litresPumped}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Prevlogs;
