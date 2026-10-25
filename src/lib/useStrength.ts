import { useMemo } from 'react';
import { useBodyweight, useExercises, useStore } from '../store/useStore';
import { computeStrength, strengthHistory } from './strength';

export function useStrength() {
  const workouts = useStore((s) => s.workouts);
  const bodyweights = useStore((s) => s.bodyweights);
  const sex = useStore((s) => s.settings.sex);
  const bodyweight = useBodyweight();
  const { byId } = useExercises();

  return useMemo(() => {
    const current = computeStrength(workouts, byId, bodyweight, sex);
    const history = strengthHistory(workouts, byId, bodyweights, sex, 12);
    const monthAgo = history.length >= 5 ? history[history.length - 5].score : undefined;
    return { current, history, change: current.overall !== null && monthAgo !== undefined ? current.overall - monthAgo : undefined, bodyweight };
  }, [workouts, byId, bodyweight, bodyweights, sex]);
}
