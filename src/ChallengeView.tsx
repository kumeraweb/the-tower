import { FormEvent, useState } from 'react';
import { FloorChallenge } from './App';

type ChallengeViewProps = {
  challenge: FloorChallenge;
  onCorrectAnswer: () => void;
  onIncorrectAnswer: () => void;
};

export default function ChallengeView({
  challenge,
  onCorrectAnswer,
  onIncorrectAnswer,
}: ChallengeViewProps) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAnswer = Number(answer);

    if (numericAnswer === challenge.answer) {
      setFeedback('Correcto. Subiendo al siguiente piso...');

      setTimeout(() => {
        onCorrectAnswer();
      }, 700);

      return;
    }

    setFeedback('Incorrecto, intenta más tarde');

    setTimeout(() => {
      onIncorrectAnswer();
    }, 900);
  }

  return (
    <section className="ChallengeView challenge-screen">
      <article className="challenge-card">
        <h2>Piso {challenge.floorNumber}</h2>
        <p className="challenge-subtitle">Resuelve el desafío</p>

        <p className="challenge-question">
          ¿Cuánto es {challenge.left} {challenge.operator} {challenge.right}?
        </p>

        <form onSubmit={handleSubmit} className="challenge-form">
          <input
            type="number"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Tu respuesta"
            required
          />
          <button type="submit">Confirmar</button>
        </form>

        {feedback ? <p className="challenge-feedback">{feedback}</p> : null}
      </article>
    </section>
  );
}
