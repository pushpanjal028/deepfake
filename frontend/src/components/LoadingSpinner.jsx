export default function LoadingSpinner({ message = 'Analyzing...', subMessage = '' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Hexagon scanner */}
      <div className="relative w-24 h-24">
        {/* Outer ring */}
        <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 100 100">
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="none"
            stroke="rgba(14, 165, 233, 0.3)"
            strokeWidth="1"
            strokeDasharray="8 4"
          />
        </svg>

        {/* Inner ring */}
        <svg className="absolute inset-3 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} viewBox="0 0 100 100">
          <polygon
            points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
            fill="none"
            stroke="rgba(14, 165, 233, 0.6)"
            strokeWidth="2"
          />
        </svg>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-veritas-accent animate-ping" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="font-display font-semibold text-veritas-text text-lg">{message}</p>
        {subMessage && (
          <p className="text-veritas-muted text-sm font-mono">{subMessage}</p>
        )}
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-veritas-accent"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
            }}
          />
        ))}
      </div>
    </div>
  )
}
