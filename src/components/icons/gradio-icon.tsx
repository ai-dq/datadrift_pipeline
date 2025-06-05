interface GradioIconProps {
  className?: string;
}

export const GradioIcon = ({ className = 'size-4' }: GradioIconProps) => (
  <img src="/gradio.svg" alt="Gradio" className={className} />
);
