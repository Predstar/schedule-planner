const frontendAreas = ['Auth', 'Users', 'Employees', 'Availability', 'Shifts', 'Schedules'];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Restaurant Scheduler MVP</p>
        <h1>Separated frontend and backend structure for the scheduling MVP.</h1>
        <p className="lede">
          The frontend is now a thin React application that will communicate
          only with the NestJS backend API. Business logic, authentication, and
          scheduling rules belong to the backend.
        </p>
      </section>

      <section className="modules">
        {frontendAreas.map((moduleName) => (
          <article key={moduleName} className="module-card">
            <h2>{moduleName}</h2>
            <p>Frontend feature area scaffolded for API-driven implementation.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
