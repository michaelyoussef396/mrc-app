import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLoadGoogleMaps, useAddressAutocomplete, PlaceDetails } from '@/hooks/useGoogleMaps'
import { MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AddressValue {
  street: string
  suburb: string
  state: string
  postcode: string
  fullAddress: string
  lat?: number
  lng?: number
}

interface AddressAutocompleteProps {
  label?: string
  placeholder?: string
  value?: AddressValue
  onChange: (address: AddressValue) => void
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function AddressAutocomplete({
  label = 'Property Address',
  placeholder = 'Start typing an address...',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isLoaded, error: mapsError } = useLoadGoogleMaps()
  const { predictions, isLoading, getPlacePredictions, getPlaceDetails, clearPredictions } = useAddressAutocomplete(inputRef)

  const [inputValue, setInputValue] = useState(value?.fullAddress || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Sync input value with prop value
  useEffect(() => {
    if (value?.fullAddress && value.fullAddress !== inputValue) {
      setInputValue(value.fullAddress)
    }
  }, [value?.fullAddress])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        clearPredictions()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [clearPredictions])

  // Handle input change
  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSelectedIndex(-1)

    if (newValue.length >= 3) {
      await getPlacePredictions(newValue)
      setShowDropdown(true)
    } else {
      clearPredictions()
      setShowDropdown(false)
    }
  }, [getPlacePredictions, clearPredictions])

  // Handle place selection
  const handleSelectPlace = useCallback(async (placeId: string, description: string) => {
    setInputValue(description)
    setShowDropdown(false)
    clearPredictions()

    const details = await getPlaceDetails(placeId)

    if (details) {
      const addressValue: AddressValue = {
        street: details.street_number && details.street_name
          ? `${details.street_number} ${details.street_name}`
          : description.split(',')[0],
        suburb: details.suburb || '',
        state: details.state || 'VIC',
        postcode: details.postcode || '',
        fullAddress: details.formatted_address,
        lat: details.lat,
        lng: details.lng
      }

      onChange(addressValue)
    }
  }, [getPlaceDetails, onChange, clearPredictions])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelectPlace(predictions[selectedIndex].place_id, predictions[selectedIndex].description)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        clearPredictions()
        break
    }
  }, [showDropdown, predictions, selectedIndex, handleSelectPlace, clearPredictions])

  // Clear input
  const handleClear = useCallback(() => {
    setInputValue('')
    clearPredictions()
    setShowDropdown(false)
    onChange({
      street: '',
      suburb: '',
      state: '',
      postcode: '',
      fullAddress: ''
    })
    inputRef.current?.focus()
  }, [onChange, clearPredictions])

  // If Google Maps not loaded, show manual entry input
  if (!isLoaded) {
    return (
      <div className={className}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="relative mt-1.5">
          <Input
            value={inputValue}
            onChange={(e) => {
              const text = e.target.value
              setInputValue(text)
              onChange({
                street: text,
                suburb: '',
                state: '',
                postcode: '',
                fullAddress: text,
              })
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        {mapsError && (
          <p className="text-xs text-amber-600 mt-1">
            Address autocomplete unavailable. You can type your address manually.
          </p>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative mt-1.5">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-10 pr-10',
            error && 'border-red-500 focus-visible:ring-red-500'
          )}
          autoComplete="off"
        />

        {/* Left icon */}
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

        {/* Right icon - loading or clear */}
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => {
            // Parse suburb from secondary_text (e.g., "Kew VIC 3101, Australia" → "Kew")
            const secondaryParts = prediction.structured_formatting.secondary_text.split(',')
            const locationPart = secondaryParts[0]?.trim() || ''

            return (
              <button
                key={prediction.place_id}
                type="button"
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b last:border-b-0',
                  index === selectedIndex && 'bg-blue-50'
                )}
                onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {prediction.structured_formatting.main_text}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    {locationPart}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AddressAutocomplete
