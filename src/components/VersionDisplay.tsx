import packageJson from '../../package.json';

interface VersionDisplayProps {
  className?: string;
}

export function VersionDisplay({ className = "" }: VersionDisplayProps) {
  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      {packageJson.version}
    </div>
  );
}