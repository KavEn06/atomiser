// PROTOTYPE — three variants of the Atomiser canvas workspace, switchable via
// ?variant= and the floating bottom bar. See NOTES.md for the question + verdict.
import { PrototypeSwitcher, useVariant } from './Switcher';
import VariantA from './variants/VariantA';
import VariantB from './variants/VariantB';
import VariantC from './variants/VariantC';

const DEFS = [
  { key: 'A', name: 'Studio' },
  { key: 'B', name: 'Manuscript' },
  { key: 'C', name: 'Mission Control' },
];

export default function App() {
  const [variant, setVariant] = useVariant(DEFS);
  return (
    <div className="h-full">
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher defs={DEFS} current={variant} onChange={setVariant} />
    </div>
  );
}
