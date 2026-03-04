import './FuelAvailabilityChart.css';

const FuelAvailabilityChart = ({
  petrol = 0,
  diesel = 0,
  title = 'Available fuel mix',
  subtitle = 'Current petrol and diesel split.',
  badge = 'Fuel Chart',
  isLoading = false,
  compact = false,
  className = '',
}) => {
  const petrolAmount = Number(petrol) || 0;
  const dieselAmount = Number(diesel) || 0;
  const totalFuel = petrolAmount + dieselAmount;

  const rootClassName = ['fuel-chart-card', compact ? 'fuel-chart-card--compact' : '', className]
    .filter(Boolean)
    .join(' ');

  const fuelCards = [
    {
      key: 'petrol',
      label: 'Petrol',
      amount: petrolAmount,
      subtitle: petrolAmount > 0 ? 'Available petrol stock' : 'No petrol stock recorded yet',
    },
    {
      key: 'diesel',
      label: 'Diesel',
      amount: dieselAmount,
      subtitle: dieselAmount > 0 ? 'Available diesel stock' : 'No diesel stock recorded yet',
    },
  ];

  return (
    <div className={rootClassName}>
      <div className="fuel-chart-copy">
        <span className="section-badge">{badge}</span>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <div className="fuel-chart-layout">
        {fuelCards.map((fuel) => (
          <div key={fuel.key} className={`fuel-ring-card fuel-ring-card--${fuel.key}`}>
            <div className="fuel-ring-wrap">
              {isLoading ? (
                <div className="fuel-chart-empty">
                  <strong>...</strong>
                  <span>Loading</span>
                </div>
              ) : (
                <div className="fuel-ring-meter" aria-label={`${fuel.label} available ${fuel.amount} liters`}>
                  <span className="fuel-ring-value-group">
                    <span className="fuel-ring-value">{fuel.amount}</span>
                    <span className="fuel-ring-unit">Liters</span>
                  </span>
                </div>
              )}
            </div>

            <div className="fuel-ring-copy">
              <span className="metric-label">{fuel.label}</span>
              <strong>{fuel.amount}L available</strong>
              <p>{fuel.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="fuel-chart-total">
        <span className="metric-label">Total available</span>
        <strong>{isLoading ? '...' : `${totalFuel}L`}</strong>
      </div>
    </div>
  );
};

export default FuelAvailabilityChart;
