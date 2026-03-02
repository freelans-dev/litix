export default function ApiDocsPage() {
  return (
    <div className="h-full w-full">
      <iframe
        src="/api/docs"
        className="w-full h-full border-0"
        title="Litix API Reference"
      />
    </div>
  )
}
