import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  DEMO_LANGS,
  LANG_LABELS,
  LANG_NAMES,
  useLanguage
} from "../context/LanguageContext";
import { colors, fonts, radii } from "../theme";

export function LanguagePill() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.pill}
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
      >
        <Text style={styles.pillLabel}>{LANG_LABELS[lang]}</Text>
        <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
      </Pressable>

      {open ? (
        <View style={styles.menu}>
          {DEMO_LANGS.map((code) => {
            const active = code === lang;
            return (
              <Pressable
                key={code}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => {
                  setLang(code);
                  setOpen(false);
                }}
              >
                <Text style={styles.itemLabel}>{LANG_LABELS[code]}</Text>
                <Text style={[styles.itemName, active && styles.itemNameActive]}>
                  {LANG_NAMES[code]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end"
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.glassStrong,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  pillLabel: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0
  },
  chevron: {
    color: colors.accent,
    fontSize: 8
  },
  menu: {
    marginTop: 6,
    minWidth: 150,
    backgroundColor: colors.glassStrong,
    borderColor: colors.hairlineStrong,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden"
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  itemActive: {
    backgroundColor: colors.accentSoft
  },
  itemLabel: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0,
    width: 22
  },
  itemName: {
    color: colors.textMuted,
    fontFamily: fonts.serifRegular,
    fontSize: 15
  },
  itemNameActive: {
    color: colors.text
  }
});
