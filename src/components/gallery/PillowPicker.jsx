import { ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import useMoodboardStore from '@/store/moodboardStore';
import { useState } from 'react';
import { parseAndLookupRelatedItems } from '@/lib/utils';

const PillowPicker = () => {
  const { allXlsxData, getMoodboardState, setMoodboardState } = useMoodboardStore();
  const activeMoodboard = getMoodboardState();
  const [openCombobox, setOpenCombobox] = useState(false);

  const handleSelectPillow = async (pillowName) => {
    const selectedPillow = allXlsxData.find((p) => p.Name === pillowName);
    if (selectedPillow) {
      const newMainProduct = {
        title: selectedPillow.Name,
        image: selectedPillow.IMAGE_URL,
        url: selectedPillow.Pillow_URL,
        withInsertID: selectedPillow.With_Insert_ID,
        withoutInsertID: selectedPillow.Without_Insert_ID,
        goesWellWith: parseAndLookupRelatedItems(selectedPillow.Goes_Well_With, allXlsxData),
        youMayAlsoLike: parseAndLookupRelatedItems(selectedPillow.You_May_Also_Like, allXlsxData),
      };
      setMoodboardState({
        selectedComboboxItem: pillowName,
        selectedGalleryItems: [...(activeMoodboard?.selectedGalleryItems || []), newMainProduct],
      });
    }
  };

  return (
    <div className="mb-6 mt-4">
      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={openCombobox} className="w-[280px] justify-between">
            {activeMoodboard?.selectedGalleryItems.length > 0 ? allXlsxData.find((pillow) => pillow.Name === activeMoodboard?.selectedComboboxItem)?.Name : 'Select a pillow...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Search pillow..." />
            <CommandList>
              <CommandEmpty>No pillow found.</CommandEmpty>
              <CommandGroup>
                {allXlsxData.map((pillow) => (
                  <CommandItem
                    key={pillow.Name}
                    value={pillow.Name}
                    onSelect={(currentValue) => {
                      handleSelectPillow(currentValue);
                      setOpenCombobox(false);
                    }}>
                    {pillow.Name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PillowPicker;
