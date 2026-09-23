import { useEffect, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MountOnFirstOpen } from './MountOnFirstOpen';

it('defers effects and preserves an answer after collapsing and reopening', () => {
  const load = vi.fn();
  function Question() {
    const [answer, setAnswer] = useState('');
    useEffect(load, []);
    return <input aria-label="Resposta" value={answer} onChange={e => setAnswer(e.target.value)} />;
  }
  const { rerender } = render(<MountOnFirstOpen open={false}><Question /></MountOnFirstOpen>);
  expect(load).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox')).toBeNull();
  rerender(<MountOnFirstOpen open><Question /></MountOnFirstOpen>);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'B' } });
  rerender(<MountOnFirstOpen open={false}><Question /></MountOnFirstOpen>);
  rerender(<MountOnFirstOpen open><Question /></MountOnFirstOpen>);
  expect(screen.getByRole('textbox')).toHaveValue('B');
  expect(load).toHaveBeenCalledTimes(1);
});
