import React from "react";

type Props = {
  blendMode: string;
  setBlendMode: (value: string) => void;
};

const ShaderSelector: React.FC<Props> = ({ blendMode, setBlendMode }) => (
  <div style={{ display: "flex", flexDirection: "column", color: "white" }}>
    <label>
      Shader:
      <select
        value={blendMode}
        onChange={(e) => setBlendMode(e.target.value)}
        style={{
          marginLeft: "10px",
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 6,
          padding: "0.25rem 0.5rem",
        }}
      >
        <option value="composite">Surface (Default)</option>
        <option value="mip">MIP</option>
      </select>
    </label>
  </div>
);

export default ShaderSelector;