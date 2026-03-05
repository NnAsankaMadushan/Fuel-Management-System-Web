import { useEffect, useState } from 'react';
import './Operator.css';
import Header from '../Header/Header';
import Footer from '../footer/footer';
import { Link } from 'react-router-dom';
import { getStationSummary } from '../../api/api';
import FuelAvailabilityChart from '../FuelAvailabilityChart/FuelAvailabilityChart';

const operatorActions = [
  {
    to: '/v-register',
    mark: 'RG',
    title: 'Register vehicle',
    description: 'Register a vehicle linked to your operator account.',
    accent: 'rgba(249, 115, 22, 0.28)',
    soft: 'var(--accent-soft)',
    text: 'var(--accent-strong)',
  },
  {
    to: '/s-fuel-quota',
    mark: 'FS',
    title: 'Fuel summary',
    description: 'Check current station fuel activity.',
    accent: 'rgba(13, 148, 136, 0.26)',
    soft: 'var(--teal-soft)',
    text: 'var(--teal)',
  },
  {
    to: '/s-prev-logs',
    mark: 'LG',
    title: 'View logs',
    description: 'Review recent station transactions.',
    accent: 'rgba(24, 33, 47, 0.18)',
    soft: 'rgba(24, 33, 47, 0.08)',
    text: 'var(--text)',
  },
  {
    to: '/scan-qr',
    mark: 'QR',
    title: 'Scan QR',
    description: 'Scan vehicle QR codes at the pump.',
    accent: 'rgba(255, 143, 74, 0.32)',
    soft: 'rgba(255, 240, 221, 0.96)',
    text: 'var(--accent-strong)',
  },
];

const Operator = () => {
  const [summary, setSummary] = useState({
    totalStations: 0,
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getStationSummary();
        setSummary({
          totalStations: data.totalStations || 0,
          totalAvailablePetrol: data.totalAvailablePetrol || 0,
          totalAvailableDiesel: data.totalAvailableDiesel || 0,
          totalTransactions: data.totalTransactions || 0,
          totalLitresDispensed: data.totalLitresDispensed || 0,
        });
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Failed to load station fuel summary.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="operator-hero panel rise-in">
          <div className="operator-hero-copy">
            <span className="section-badge">Operator</span>
            <h1>Operator dashboard</h1>
            <p className="lead-text">Check station fuel activity, review logs, and scan vehicle QR codes.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Stations</div>
              <div className="metric-value">{isLoading ? '...' : summary.totalStations}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Transactions</div>
              <div className="metric-value">{isLoading ? '...' : summary.totalTransactions}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Dispensed</div>
              <div className="metric-value">{isLoading ? '...' : `${summary.totalLitresDispensed}L`}</div>
            </div>
          </div>

          <FuelAvailabilityChart
            petrol={summary.totalAvailablePetrol}
            diesel={summary.totalAvailableDiesel}
            title="Available fuel status"
            subtitle="Current petrol and diesel balance for the assigned station."
            badge="Fuel Status"
            isLoading={isLoading}
            className="operator-fuel-chart"
          />

          {error ? <div className="response-banner error-banner">{error}</div> : null}
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="section-badge">Quick Actions</span>
              <h2>Operator tools</h2>
            </div>
          </div>

          <div className="action-grid">
            {operatorActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="action-card"
                style={{
                  '--tile-accent': action.accent,
                  '--tile-soft': action.soft,
                  '--tile-text': action.text,
                }}
              >
                <div className="action-card-top">
                  <h3>{action.title}</h3>
                  <span className="action-card-mark">{action.mark}</span>
                </div>
                <p>{action.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Operator;
