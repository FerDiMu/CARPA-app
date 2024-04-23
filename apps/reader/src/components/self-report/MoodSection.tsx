export const script_mood: [string, string][] = [
  ['self-report/', '0:3'],
  ['emojis/very-tired', '0:1.5'],
  ['emojis/tired', '0:2'],
  ['emojis/normal', '0:1.5'],
  ['emojis/excited', '0:1.5'],
  ['emojis/very-excited', '0:1.5'],
]

export function Popup_Mood() {
  //Locations of image sources are relative to location of iframe's html
  return (
    <div
      id="emojis-div"
      data-during="emojis/"
      style={{
        width: '100%',
        position: 'absolute',
        top: '75%',
        display: 'flex',
        justifyContent: 'space-between',
        paddingLeft: '15px',
        paddingRight: '15px',
      }}
    >
      <input
        data-from-first="emojis/very-tired"
        src="../emojis/overly-tired-emoji-twitter.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="mood very-tired"
      />
      <input
        data-from-first="emojis/tired"
        src="../emojis/tired-emoji-twitter.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="mood tired"
      />
      <input
        data-from-first="emojis/normal"
        src="../emojis/middle-ground-emoji-twitter.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="mood normal"
      />
      <input
        data-from-first="emojis/excited"
        src="../emojis/excited-emoji-twitter.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="mood excited"
      />
      <input
        data-from-first="emojis/very-excited"
        src="../emojis/overly-excited-emoji-twitter.svg"
        type="image"
        style={{
          width: '10%',
          height: '10%',
          cursor: 'pointer',
        }}
        value="mood overly-excited"
      />
    </div>
  )
}
