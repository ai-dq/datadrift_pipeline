interface SwaggerIconProps {
  className?: string;
}

export const SwaggerIcon = ({ className = 'size-4' }: SwaggerIconProps) => (
  <img src="/swagger.svg" alt="Swagger" className={className} />
);
