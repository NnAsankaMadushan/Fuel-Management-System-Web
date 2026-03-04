import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import './StationQuota.css';
import { getStationSummary } from '../../../api/api';
import FuelAvailabilityChart from '../../FuelAvailabilityChart/FuelAvailabilityChart';

const StationQuota = () => {
  const [summary, setSummary] = useState({
    totalStations: 0,
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
    chart: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getStationSummary();
        setSummary(data);
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load station summary.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const chartData = {
    labels: summary.chart.map((item) => item.label),
    datasets: [
      {
        label: 'Liters dispensed',
        data: summary.chart.map((item) => item.litres),
        backgroundColor: 'rgba(249, 115, 22, 0.78)',
        borderRadius: 14,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="quota-hero panel rise-in">
          <div>
            <span className="section-badge">Station Fuel</span>
            <h1>Fuel summary</h1>
            <p className="lead-text">Review current fuel activity for the assigned station.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Stations</div>
              <div className="metric-value">{summary.totalStations}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Transactions</div>
              <div className="metric-value">{summary.totalTransactions}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Dispensed</div>
              <div className="metric-value">{summary.totalLitresDispensed}L</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Petrol Available</div>
              <div className="metric-value">{summary.totalAvailablePetrol}L</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Diesel Available</div>
              <div className="metric-value">{summary.totalAvailableDiesel}L</div>
            </div>
          </div>
        </section>

        <section className="progress-shell page-section">
          <div className="chart-panel panel">
            <span className="section-badge">Weekly Trend</span>
            <h2>Recent liters</h2>
            {isLoading ? (
              <div className="empty-state">Loading station summary...</div>
            ) : error ? (
              <div className="response-banner error-banner">{error}</div>
            ) : summary.chart.length === 0 ? (
              <div className="empty-state">No recent transaction data found.</div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>

          <div className="quota-side-stack">
            <FuelAvailabilityChart
              petrol={summary.totalAvailablePetrol}
              diesel={summary.totalAvailableDiesel}
              title="Available fuel status"
              subtitle="Current petrol and diesel balance for this station scope."
              badge="Fuel Status"
              isLoading={isLoading}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StationQuota;
