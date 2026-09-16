import { useId } from "react";
import { AshMouth } from "./ash-mouth";
export function CustomCase({
  ash = false,
  satchel = false,
  opening = false,
}: {
  ash?: boolean;
  satchel?: boolean;
  opening?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  if (ash && !satchel) return <AshMouth opening={opening} />;
  return (
    <div
      className={`custom-case ${satchel ? "satchel-crate" : ash ? "ash-crate" : "basic-crate"} ${opening ? "crate-opening" : ""}`}
      aria-label={
        satchel
          ? "Semen Satchel with a white demon rising from its lid"
          : ash
            ? "Ash case with yellow teeth and smoke"
            : "Spunk case dripping white glue"
      }
      role="img"
    >
      <div className="crate-aura" />
      <div className="crate-shadow" />
      {(ash || satchel) && (
        <div className="crate-smoke" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <svg
        viewBox={satchel ? "0 -60 440 390" : "0 0 440 330"}
        className="crate-object"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id + "metal"} x2=".8" y2="1">
            <stop
              stopColor={satchel ? "#d5d8e0" : ash ? "#6c6952" : "#adb4a3"}
            />
            <stop offset=".32" stopColor={ash ? "#35382c" : "#515e49"} />
            <stop offset="1" stopColor="#111810" />
          </linearGradient>
          <linearGradient id={id + "lid"} x2=".2" y2="1">
            <stop
              stopColor={satchel ? "#f0efff" : ash ? "#c6b06b" : "#edffe1"}
            />
            <stop offset="1" stopColor={ash ? "#656238" : "#839c6b"} />
          </linearGradient>
        </defs>
        {satchel && (
          <g className="white-demon">
            <path
              d="M166 76Q153 27 143 17Q184 22 190 48M269 48Q282 17 312 12Q288 47 291 77"
              fill="#e7e7fa"
              stroke="#929db1"
              strokeWidth="2"
            />
            <path
              d="M177 65Q228 25 276 59L291 100 273 150 292 171 161 173 179 138 164 104Z"
              fill="#e7ebf6"
              stroke="#acb5c5"
              strokeWidth="2"
            />
            <path
              d="M181 92L213 105 192 112ZM271 88L242 103 264 108Z"
              fill="#7f57e6"
            />
            <path d="M219 110L229 98 238 114Z" fill="#3b3d58" />
            <path d="M198 122L257 118 245 137 214 141Z" fill="#24273b" />
            <path
              d="M209 122L214 135 219 121M237 120L240 132 246 120"
              stroke="#fefcff"
              strokeWidth="5"
            />
            <path
              d="M178 133Q130 122 130 160L160 161M276 125Q324 118 329 151L300 158"
              fill="none"
              stroke="#e3e6f2"
              strokeWidth="17"
            />
            <path
              d="M198 152Q227 135 261 148L273 186 181 194Z"
              fill="#dde3f080"
            />
          </g>
        )}
        <g className="crate-body">
          <path
            d="M68 140L310 127 372 159 350 271 112 299 66 264Z"
            fill={`url(#${id}metal)`}
            stroke="#869275"
            strokeWidth="2"
          />
          <path
            d="M112 166L350 144 350 271 112 299Z"
            fill={ash ? "#34392c" : "#273b26"}
          />
          <path
            d="M126 182L333 161 332 251 126 276Z"
            fill="#111c16"
            stroke={ash ? "#d6bd70" : "#b9ea83"}
            strokeWidth="2"
          />
          <path d="M72 157L102 176 102 276 73 256Z" fill="#151d14" />
          <path
            d="M150 171L159 282M300 157L294 266"
            stroke={ash ? "#96864d" : "#799864"}
            strokeWidth="10"
          />
          <path d="M119 286L343 260" stroke="#8c9875" strokeWidth="5" />
          <text
            x="229"
            y="224"
            textAnchor="middle"
            transform="rotate(-6 229 224)"
            fill={ash ? "#f7d779" : "#ddffc5"}
            fontFamily="Arial Black,Arial"
            fontWeight="900"
            fontSize={satchel ? "23" : ash ? "40" : "31"}
          >
            {satchel ? "SATCHEL" : ash ? "ASH" : "SPUNK"}
          </text>
          <text
            x="229"
            y="246"
            textAnchor="middle"
            transform="rotate(-6 229 246)"
            fill="#a7b29c"
            fontFamily="Arial"
            fontWeight="700"
            letterSpacing="5"
            fontSize="10"
          >
            {satchel ? "UNLEASH IT" : ash ? "HANDLE WITH CARE" : "THE ORIGINAL"}
          </text>
        </g>
        <g className="crate-lid">
          <path
            d="M65 140L97 90 322 77 378 113 354 164 111 188Z"
            fill={`url(#${id}lid)`}
            stroke={ash ? "#e0cc84" : "#d0e7bb"}
            strokeWidth="2"
          />
          <path
            d="M84 137L112 105 316 92 354 115 332 142 124 162Z"
            fill={ash ? "#4b4e30" : "#577246"}
          />
          <path d="M141 142L158 118 290 109 309 121 292 132Z" fill="#1b271a" />
          <path
            d="M108 171L356 147 351 166 111 190 64 160 64 141Z"
            fill={ash ? "#8f7c46" : "#b2c698"}
          />
          {!ash ? (
            <path
              className="glue-sheen"
              d="M68 139Q83 133 100 153Q115 166 133 161L350 140 349 170Q345 187 338 176L335 161 316 163 313 206Q306 221 301 205L301 167 271 170 267 186Q261 196 255 184L253 173 217 177 214 234Q207 250 200 233L198 179 174 181 170 204Q162 215 157 201L154 183 125 186 120 211Q112 221 107 208L105 180 85 168 80 190Q71 197 69 180Z"
              fill={satchel ? "#eef0ff" : "#f5fff1"}
            />
          ) : (
            <g className="crate-teeth">
              <path d="M122 174L342 153 333 189 131 211Z" fill="#12160e" />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <path
                  key={n}
                  d={`M${135 + n * 25} ${176 - n * 2.5}l19 -2 -1 29q-9 12 -17 2Z`}
                  fill={n % 2 ? "#d4b349" : "#f2ce65"}
                  stroke="#6b5420"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
          <path
            d="M229 91L233 67 270 63 281 84"
            fill="none"
            stroke="#1b2719"
            strokeWidth="9"
          />
        </g>
        <g opacity=".8">
          <path
            d="M145 195L155 194 155 215 145 216ZM304 179L314 178 312 199 302 200Z"
            fill="#b8bca3"
            stroke="#172017"
            strokeWidth="2"
          />
          {[0, 1, 2, 3].map((n) => (
            <g key={n}>
              <circle
                cx={126 + n * 69}
                cy={281 - n * 7.5}
                r="3"
                fill="#b9c3af"
              />
              <path
                d={`M${124 + n * 69} ${281 - n * 7.5}h4`}
                stroke="#333b2c"
              />
            </g>
          ))}
          <path
            d="M115 291L345 265M73 171L75 251"
            fill="none"
            stroke="#d4e0c0"
            strokeWidth="1"
          />
        </g>
      </svg>
      {!ash && (
        <div className="falling-glue" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  );
}
