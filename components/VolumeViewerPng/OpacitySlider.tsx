import React from "react";

type Props = {
  opacityLevel: number;
  setOpacityLevel: (value: number) => void;
};

const OpacitySlider: React.FC<Props> = ({ opacityLevel, setOpacityLevel }) => (
  <div style={{ display: "flex", flexDirection: "column", color: "white" }}>
    <label>
      Opacity:
      <input
        type="range"
        min="0"
        max="3"
        step="0.01"
        value={opacityLevel}
        onChange={(e) => setOpacityLevel(parseFloat(e.target.value))}
        style={{ marginLeft: "10px" }}
      />
    </label>
  </div>
);

export default OpacitySlider;