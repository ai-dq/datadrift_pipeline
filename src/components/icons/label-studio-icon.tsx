interface LabelStudioIconProps {
  className?: string;
}

export const LabelStudioIcon = ({
  className = 'size-4',
}: LabelStudioIconProps) => (
  <img src="/label-studio.svg" alt="Label Studio" className={className} />
);
