"use client";

import React from "react";

type Props = {
  setViewOrientation: (dir: string) => void;
  handleAutoFocus: () => void;
};

const buttonStyle: React.CSSProperties = {
  background: "#ffffff10",
  border: "1px solid #888",
  color: "white",
  fontSize: "0.75rem",
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
  transition: "background 0.2s ease, transform 0.2s ease",
  textAlign: "center",
};

const ViewControls: React.FC<Props> = ({ setViewOrientation, handleAutoFocus }) => {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto",
          gap: 6,
        }}
      >
        <button style={buttonStyle} onClick={() => setViewOrientation("front")}>
          Front
        </button>
        <button style={buttonStyle} onClick={() => setViewOrientation("back")}>
          Back
        </button>
        <button style={buttonStyle} onClick={() => setViewOrientation("top")}>
          Top
        </button>
        <button style={buttonStyle} onClick={() => setViewOrientation("bottom")}>
          Bottom
        </button>
        <button style={buttonStyle} onClick={() => setViewOrientation("left")}>
          Left
        </button>
        <button style={buttonStyle} onClick={() => setViewOrientation("right")}>
          Right
        </button>
      </div>
      <button
        style={{
          ...buttonStyle,
          marginTop: 8,
          width: "100%",
          fontSize: "0.7rem",
        }}
        onClick={handleAutoFocus}
      >
        ⟳ Auto Focus
      </button>
    </div>
  );
};

export default ViewControls;