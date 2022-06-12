declare module 'uc.micro' {
  export { default as Any } from "uc.micro/properties/Any/regex";
  export { default as Cc } from "uc.micro/categories/Cc/regex";
  export { default as Cf } from "uc.micro/categories/Cf/regex";
  export { default as P } from "uc.micro/categories/P/regex";
  export { default as Z } from "uc.micro/categories/Z/regex"
}

declare module 'uc.micro/properties/Any/regex' {
  const regex: RegExp
  export default regex
}

declare module 'uc.micro/categories/Cc/regex' {
  const re: RegExp
  export default re
}

declare module 'uc.micro/categories/Cf/regex' {
  const re: RegExp
  export default re
}

declare module 'uc.micro/categories/P/regex' {
  const re: RegExp
  export default re
}

declare module 'uc.micro/categories/Z/regex' {
  const re: RegExp
  export default re
}

declare module "entities/lib/maps/entities.json" {
  const _: { [key: string]: string }
  export default _
}

declare module 'mathjax' {

}

declare module '*.woff2';
declare module '*.css';