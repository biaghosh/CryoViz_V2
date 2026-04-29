type Props = {
    quality: number;
    setQuality: (value: number) => void;
  };
  
  const RenderQualitySlider: React.FC<Props> = ({ quality, setQuality }) => (
    <div style={{ display: "flex", flexDirection: "column", color: "white" }}>
    <label >
      Render Quality:
      <input
        type="range"
        min={0.1}
        max={2}
        step={0.1}
        value={quality}
        onChange={(e) => setQuality(parseFloat(e.target.value))}
      />
    </label>
    </div>
  );
  
  export default RenderQualitySlider;