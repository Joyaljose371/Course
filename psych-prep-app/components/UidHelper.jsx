export function UidHelper({ uid }) {
  if (!uid) return null;

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10.5,
      color: "#93A6BE",
      padding: "4px 8px",
      border: "1px solid #2C4468",
      borderRadius: 999,
      background: "rgba(255,255,255,0.04)",
    }}>
      UID: {uid}
    </div>
  );
}

export default UidHelper;
