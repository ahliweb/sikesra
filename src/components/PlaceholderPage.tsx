interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-600">
        {description ?? `Halaman ${title} sedang dalam pengembangan.`}
      </p>
    </div>
  );
}
