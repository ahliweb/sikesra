import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function ThemesSearchBar({
  searchTerm,
  setSearchTerm,
}) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search themes..."
        className="bg-background pl-9"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />
    </div>
  );
}

export default ThemesSearchBar;
