export default function AreaEmptyState({ analyzed, status }) {
  if(!analyzed)return <p className="empty-state">Run an analysis to view sites.</p>
  if(status?.refreshFailed)return <div className="area-empty"><h3>Viewport data has not loaded</h3><p>The latest request did not complete. This is not a result about site suitability.</p></div>
  return <div className="area-empty"><h3>No site data returned for this view</h3><p>Move the map or zoom out to view available sample points. Sites that do not meet mission constraints are also included when data is available.</p></div>
}
