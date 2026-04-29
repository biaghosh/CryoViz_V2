import React from "react";

type Props = {
  clip: { x: number; y: number; z: number };
  setClip: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  max: { x: number; y: number; z: number };
};

const ClippingControls: React.FC<Props> = ({ clip, setClip, max }) => {
  const updateClip = (axis: "x" | "y" | "z", value: number) => {
    setClip((prev) => ({ ...prev, [axis]: value }));
  };

  return (
    <div>
      {(["x", "y", "z"] as const).map((axis) => (
        <div key={axis} style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ width: "50px" }}>{axis.toUpperCase()}:</span>
            <input
              type="range"
              min={0}
              max={axis === "z" ? max.z * 3 : max[axis]}
              value={clip[axis]}
              onChange={(e) => updateClip(axis, +e.target.value)}
              style={{ flex: 1, margin: "0 10px" }}
            />
            <input
              type="number"
              min={0}
              max={axis === "z" ? max.z * 3 : max[axis]}
              value={clip[axis]}
              onChange={(e) => updateClip(axis, +e.target.value)}
              style={{
                width: "50px",
                background: "transparent",
                border: "1px solid #ccc",
                color: "white",
                padding: "2px 4px",
                borderRadius: "4px",
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
};

export default ClippingControls;


