import { useState } from 'react';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../data/exercises';
import { uid } from '../lib/id';
import { useStore } from '../store/useStore';
import type { Equipment, Exercise, ExerciseType, Muscle } from '../types';
import { Sheet } from './Sheet';

const TYPE_LABELS: Record<ExerciseType, string> = {
  weight_reps: 'Weight × reps',
  reps: 'Bodyweight reps (+ optional weight)',
  duration: 'Time',
  distance_duration: 'Distance + time',
};

interface Props {
  initialName?: string;
  existing?: Exercise;
  onClose: () => void;
  onSaved: (e: Exercise) => void;
}

export function CustomExerciseSheet({ initialName = '', existing, onClose, onSaved }: Props) {
  const save = useStore((s) => s.saveCustomExercise);
  const [name, setName] = useState(existing?.name ?? initialName);
  const [primary, setPrimary] = useState<Muscle>(existing?.primary ?? 'chest');
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'barbell');
  const [type, setType] = useState<ExerciseType>(existing?.type ?? 'weight_reps');

  const submit = () => {
    if (!name.trim()) return;
    const exercise: Exercise = {
      id: existing?.id ?? `custom-${uid()}`,
      name: name.trim(),
      primary,
      secondary: existing?.secondary ?? [],
      equipment,
      type,
      custom: true,
    };
    save(exercise);
    onSaved(exercise);
  };

  return (
    <Sheet
      title={existing ? 'Edit exercise' : 'New exercise'}
      onClose={onClose}
      footer={
        <button className="btn btn-primary btn-lg btn-block" disabled={!name.trim()} onClick={submit}>
          Save exercise
        </button>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Landmine Press" />
        </label>
        <label className="field">
          <span>Primary muscle</span>
          <select className="select" value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
            {Object.entries(MUSCLE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Equipment</span>
          <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
            {Object.entries(EQUIPMENT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>How do you log it?</span>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
            {Object.entries(TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
