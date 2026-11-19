import runDeploymentStep from "./step.mjs";
import verifyDeploymentWorktree from "./worktree.mjs";

export default function createDeploymentOperations({ repositoryPath, run, steps, status }) {
  const onStart = (currentStep, priorSteps) =>
    status.update({ currentStep, steps: structuredClone(priorSteps) });
  return {
    step: (name, command, args) =>
      runDeploymentStep({ name, command, args, repositoryPath, run, steps, onStart }),
    verifyCleanWorktree: (afterStep) =>
      verifyDeploymentWorktree({ afterStep, repositoryPath, run, steps, onStart }),
    onStart,
  };
}
