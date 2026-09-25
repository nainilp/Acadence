import React from 'react';
export default function Pet({happy=false,className=''}) {
  return <svg className={`dog ${happy?'dog-happy':''} ${className}`} viewBox="0 0 300 280" role="img" aria-label="A fluffy white Shih Tzu with small brown patches and a blue bandana">
    <defs><linearGradient id="fur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e6ebf3"/></linearGradient><linearGradient id="ear" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#cfd7e5"/><stop offset=".45" stopColor="#f9fbff"/><stop offset="1" stopColor="#e0e6f0"/></linearGradient></defs>
    <ellipse cx="150" cy="259" rx="83" ry="12" fill="#244877" opacity=".10"/>
    <path className="dog-tail" d="M206 213C246 229 266 194 250 178C239 167 226 179 233 192C220 188 214 202 206 213" fill="url(#fur)" stroke="#d8e0ed" strokeWidth="3"/>
    <path d="M98 169Q75 201 91 247Q105 262 129 246L174 247Q202 263 215 244Q224 208 201 169Z" fill="url(#fur)" stroke="#d8e0ed" strokeWidth="2"/>
    <path d="M201 206Q216 209 214 225Q207 232 195 225Q189 216 201 206Z" fill="#ae7e56"/>
    <path d="M104 222Q84 230 91 249Q108 264 133 251L133 226M170 226L169 251Q195 264 211 249Q219 230 198 222" fill="#fff" stroke="#dde4ef" strokeWidth="2"/>
    <path d="M102 179L151 223L202 178Q151 196 102 179" fill="#5274dc"/><path d="M123 192L151 217L175 192" fill="none" stroke="#829ced" strokeWidth="2"/><circle cx="151" cy="204" r="4" fill="#f4cf76"/>
    <g className="dog-head">
      <path d="M88 81Q53 63 42 104L34 162Q33 183 48 189L58 181Q63 194 75 182L85 153Z" fill="url(#ear)" stroke="#d1dae8" strokeWidth="2"/>
      <path d="M211 81Q247 63 258 104L266 162Q267 183 252 189L242 181Q237 194 225 182L215 153Z" fill="url(#ear)" stroke="#d1dae8" strokeWidth="2"/>
      <path d="M76 143Q59 117 76 89Q78 69 97 61Q98 41 119 45Q129 21 147 36Q165 19 178 44Q201 37 207 62Q230 72 226 97Q244 116 225 143Q227 166 209 176Q196 199 173 190Q151 207 130 191Q108 200 92 180Q72 174 76 143Z" fill="url(#fur)" stroke="#dbe3ef" strokeWidth="2"/>
      <path d="M103 63L114 81M130 46L137 74M167 46L162 72M195 64L184 81" stroke="#e0e6f0" strokeWidth="3" strokeLinecap="round"/>
      <path d="M90 94Q96 79 110 85Q126 89 127 107Q124 125 109 130Q91 132 88 117Q83 106 90 94Z" fill="#b88a63"/>
      <path d="M239 150Q254 141 261 153L264 164Q266 181 253 185L243 177Q234 180 233 170Z" fill="#a87853"/>
      <ellipse cx="113" cy="122" rx="22" ry="23" fill="#e7ecf4"/><ellipse cx="187" cy="122" rx="22" ry="23" fill="#e7ecf4"/>
      <g className="dog-eyes"><ellipse cx="114" cy="122" rx="12" ry="14" fill="#26364b"/><ellipse cx="186" cy="122" rx="12" ry="14" fill="#26364b"/><circle cx="110" cy="117" r="4" fill="#fff"/><circle cx="182" cy="117" r="4" fill="#fff"/><circle cx="117" cy="128" r="2" fill="#72849e"/><circle cx="189" cy="128" r="2" fill="#72849e"/></g>
      <path d="M98 143Q107 128 130 137Q150 126 169 137Q192 129 203 144Q209 163 188 168Q176 188 152 175Q128 190 115 169Q94 165 98 143Z" fill="#fff"/>
      <ellipse cx="95" cy="146" rx="10" ry="5" fill="#efc2c7" opacity=".65"/><ellipse cx="205" cy="146" rx="10" ry="5" fill="#efc2c7" opacity=".65"/>
      <path d="M138 143Q150 137 163 143Q166 148 151 156Q135 149 138 143Z" fill="#29384b"/><path d="M151 156V164M151 164Q140 175 132 165M151 164Q161 175 170 165" fill="none" stroke="#35465e" strokeWidth="3" strokeLinecap="round"/>
      <path d="M143 173Q151 178 159 173V180Q151 192 143 180Z" fill="#e69bab"/>
      <path d="M75 111L70 147M63 103L57 157M225 110L231 147M237 104L243 157" stroke="#d8e0ec" strokeWidth="2" strokeLinecap="round"/>
    </g>
  </svg>;
}
