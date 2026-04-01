const sizes = [1, 2, 3, 4, 5, 6];

export default function PartySizePicker({ selected, onSelect, readOnly }) {
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        Select the number of people attending. You'll enter a name and choose ticket packages for each person.
      </p>
      <div className="flex gap-3 flex-wrap">
        {sizes.map(n => (
          <button
            key={n}
            onClick={() => !readOnly && onSelect(n)}
            disabled={readOnly}
            className={`
              w-14 h-14 rounded-2xl text-xl font-extrabold border-2 transition-all duration-150
              ${selected === n
                ? 'bg-navy border-navy text-white scale-110 shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-navy hover:text-navy hover:scale-105'
              }
              ${readOnly && selected !== n ? 'opacity-0 pointer-events-none' : ''}
            `}
          >
            {n}
          </button>
        ))}
      </div>
      {selected > 0 && (
        <p className="text-sm text-slate-400 mt-3">
          Party of <strong className="text-navy">{selected}</strong> — {selected} seat{selected > 1 ? 's' : ''} will be reserved.
        </p>
      )}
    </div>
  );
}
