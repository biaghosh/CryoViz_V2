// components/LoadingOverlay.tsx

export default function LoadingOverlay({ message = "Initializing Orthographic Viewer..." }) {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          animation: "fadeIn 0.4s ease-in-out",
        }}
      >
        <div style={{ position: "relative", width: "80px", height: "80px" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: "5px solid #4caf50",
              borderTop: "5px solid transparent",
              animation: "spin 1.2s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#4caf50",
              opacity: 0.3,
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "22px",
              left: "22px",
              width: "36px",
              height: "36px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#ffffff",
              opacity: 0.7,
              fontFamily: "Trajan, serif",
              letterSpacing: "1px",
            }}
          >
            BIV
          </div>
        </div>
  
        <div
          style={{
            color: "#e0e0e0",
            fontSize: "1rem",
            marginTop: "1.25rem",
            fontWeight: 400,
            opacity: 0.85,
            letterSpacing: "0.5px",
          }}
        >
          {message}
        </div>
  
        <style>
          {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
  
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.4); opacity: 0.6; }
          }
  
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          `}
        </style>
      </div>
    );
  }