async function loadDashboard() {
  const response = await fetch("/api/admin/dashboard");

  if (!response.ok) {
    throw new Error("Não foi possível carregar o dashboard.");
  }

  const data = await response.json();

  renderStats(data.stats);
  renderPendingReservations(data.reservasPendentes);
  renderPendingQuotes(data.orcamentosRecentes);
  renderUpcomingEvents(data.proximosEventos);
}

loadDashboard().catch((error) => {
  console.error(error);
  document.body.dataset.error = "dashboard";
});