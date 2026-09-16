function AddPackageModal({ open, onClose, onAdd }) {
  const [type, setType] = useState('box');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [dimUnit, setDimUnit] = useState('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add package"
      primaryAction={{
        content: 'Add package',
        onAction: () => {
          onAdd({ name: name || 'Custom package', desc: `${length} × ${width} × ${height} ${dimUnit}, ${weight || 0} ${weightUnit}` });
          onClose();
        },
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <div style={{ marginBottom: '16px' }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold" paddingBottom="200">Package type</Text>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div 
              onClick={() => setType('box')}
              style={{ flex: 1, padding: '8px', border: type === 'box' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'box' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path fillRule="evenodd" d="M14 6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zm-8 2h8v6H6V8zm1.5 1.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zM5 3a1 1 0 000 2h10a1 1 0 100-2H5z"/></svg>
              <span style={{ fontSize: '13px' }}>Box</span>
            </div>
            <div 
              onClick={() => setType('envelope')}
              style={{ flex: 1, padding: '8px', border: type === 'envelope' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'envelope' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path d="M17.5 4.5h-15c-.827 0-1.5.673-1.5 1.5v8c0 .827.673 1.5 1.5 1.5h15c.827 0 1.5-.673 1.5-1.5v-8c0-.827-.673-1.5-1.5-1.5zm-15 1.5h15v.854l-7.5 4.286-7.5-4.286v-.854zm0 8v-5.698l7.004 4.002a.997.997 0 00.992 0l7.004-4.002v5.698h-15z"/></svg>
              <span style={{ fontSize: '13px' }}>Envelope</span>
            </div>
            <div 
              onClick={() => setType('soft')}
              style={{ flex: 1, padding: '8px', border: type === 'soft' ? '2px solid #2c6ecb' : '1px solid #c9cccf', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: type === 'soft' ? '#f0f4f8' : '#fff' }}
            >
              <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#5c5f62', marginRight: '6px' }}><path d="M15 3h-10c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-10c0-1.103-.897-2-2-2zm-10 2h10v3h-10v-3zm0 10v-5h10v5h-10z"/></svg>
              <span style={{ fontSize: '13px' }}>Soft package</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 3 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <TextField label="Length" type="number" value={length} onChange={setLength} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <TextField label="Width" type="number" value={width} onChange={setWidth} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <TextField label="Height" type="number" value={height} onChange={setHeight} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <Select label={<span style={{opacity: 0}}>Unit</span>} options={['cm', 'in']} value={dimUnit} onChange={setDimUnit} />
              </div>
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 2 }}>
                <TextField label="Weight (empty)" type="number" value={weight} onChange={setWeight} autoComplete="off" />
              </div>
              <div style={{ flex: 1 }}>
                <Select label={<span style={{opacity: 0}}>Unit</span>} options={['kg', 'g', 'lb', 'oz']} value={weightUnit} onChange={setWeightUnit} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <TextField label="Package name" value={name} onChange={setName} autoComplete="off" />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Checkbox 
            label="Use as default package for all products" 
            helpText="Used to calculate rates at checkout and pre-selected when buying labels"
            checked={isDefault}
            onChange={setIsDefault}
          />
        </div>
      </Modal.Section>
    </Modal>
  );
}
